import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Load migration SQL content
const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20261108000000_phase14_journal_and_notes.sql'
);

test('Phase 14.1 Migration: Migration file exists and has valid header and structure', () => {
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(sql.length > 500, 'Migration file must contain substantial DDL definitions');
  assert.ok(sql.includes('public.journal_entries'), 'Must define public.journal_entries');
  assert.ok(sql.includes('public.journal_movie_relations'), 'Must define public.journal_movie_relations');
  assert.ok(sql.includes('public.personal_notes'), 'Must define public.personal_notes');
  assert.ok(sql.includes('public.handle_updated_at()'), 'Must reference existing public.handle_updated_at helper');
  assert.ok(!sql.includes('moddatetime'), 'Must NOT depend on uncreated moddatetime extension');
});

test('Schema & Constraints: journal_entries supports calendar date and draft/published rules', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Calendar date semantics (date NOT NULL DEFAULT CURRENT_DATE)
  assert.ok(
    /entry_date\s+date\s+not\s+null\s+default\s+current_date/i.test(sql),
    'entry_date must use calendar date NOT NULL DEFAULT CURRENT_DATE'
  );

  // Multi-entry per day verification: No unique constraint on (user_id, entry_date)
  assert.ok(!sql.includes('unique (user_id, entry_date)'), 'Must NOT constrain entry_date uniquely per user');
  assert.ok(!sql.includes('unique(user_id, entry_date)'), 'Must NOT constrain entry_date uniquely per user');

  // Title mandatory (1–200 characters)
  assert.ok(sql.includes('char_length(trim(title)) >= 1'), 'Title must require non-empty trim');
  assert.ok(sql.includes('char_length(title) <= 200'), 'Title must be capped at 200 chars');

  // Draft vs Published content check constraint
  assert.ok(sql.includes('char_length(content) <= 50000'), 'Content must allow up to 50,000 chars');
  assert.ok(
    sql.includes('is_draft = true') && sql.includes('char_length(trim(content)) >= 1'),
    'Content check must allow empty drafts but require non-whitespace for published'
  );

  // Mood preset check constraint
  const presets = [
    'Melankolis',
    'Kontemplatif',
    'Nostalgia',
    'Tenang',
    'Resah',
    'Hangat',
    'Puitis',
    'Soliter',
  ];
  for (const preset of presets) {
    assert.ok(sql.includes(`'${preset}'`), `Mood constraint must include preset '${preset}'`);
  }
  assert.ok(sql.includes('mood is null or mood in'), 'Mood must be nullable (entry without mood is valid)');

  // Tags and draft default
  assert.ok(sql.includes("tags text[] not null default array[]::text[]"), 'Tags must default to empty text array');
  assert.ok(sql.includes('is_draft boolean not null default false'), 'is_draft must default to false');

  // Cascade and updated_at trigger
  assert.ok(sql.includes('references auth.users(id) on delete cascade'), 'user_id must cascade delete on auth user removal');
  assert.ok(sql.includes('set_journal_entries_updated_at'), 'Must attach updated_at trigger');
});

test('Schema & Constraints: journal_movie_relations enforces Many-to-Many and cross-ownership trigger with explicit error codes', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Foreign keys with cascade
  assert.ok(sql.includes('references public.journal_entries(id) on delete cascade'), 'Must reference journal_entries with cascade delete');
  assert.ok(sql.includes('references public.movies(id) on delete cascade'), 'Must reference public.movies with cascade delete');

  // Unique constraint preventing duplicate link pairs
  assert.ok(sql.includes('constraint journal_movie_unique unique (journal_entry_id, movie_id)'), 'Must enforce unique (journal_entry_id, movie_id)');

  // Cross-ownership trigger with explicit P0001 and P0002 codes and hardened search_path = ''
  assert.ok(sql.includes('validate_journal_movie_ownership'), 'Must define validate_journal_movie_ownership function');
  assert.ok(
    /create or replace function public\.validate_journal_movie_ownership\(\)[\s\S]+?security definer[\s\S]+?set search_path\s*=\s*''/i.test(sql),
    "Trigger function must be security definer and set search_path = ''"
  );
  assert.ok(sql.includes('public.journal_entries'), 'Function must use schema-qualified public.journal_entries');
  assert.ok(sql.includes('public.movies'), 'Function must use schema-qualified public.movies');
  assert.ok(sql.includes('check_journal_movie_ownership'), 'Must attach check_journal_movie_ownership trigger');
  assert.ok(sql.includes("using errcode = 'P0001'"), 'Trigger must assign P0001 for journal ownership failure');
  assert.ok(sql.includes("using errcode = 'P0002'"), 'Trigger must assign P0002 for movie ownership failure');
});

test('Schema & Constraints: personal_notes preserves default empty string title and 10k content cap', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Title optional in UX, stored as empty string by default
  assert.ok(
    /title\s+text\s+not\s+null\s+default\s+''\s+check\s*\(\s*char_length\(title\)\s*<=\s*200\s*\)/i.test(sql),
    "Must preserve title text not null default '' check (char_length(title) <= 200)"
  );

  // Decoupled from watch_logs
  assert.ok(!sql.includes('references public.watch_logs'), 'personal_notes must NOT reference watch_logs');

  // Pinning and Content
  assert.ok(sql.includes('is_pinned boolean not null default false'), 'is_pinned must default to false');
  assert.ok(sql.includes('char_length(trim(content)) >= 1'), 'Notes content must not be blank');
  assert.ok(sql.includes('char_length(content) <= 10000'), 'Notes content must allow up to 10,000 chars');
  assert.ok(sql.includes('set_personal_notes_updated_at'), 'Must attach updated_at trigger for personal_notes');
});

test('Performance: Indexes match chronological order and query patterns', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // GIN indexes for array searching
  assert.ok(/journal_entries_tags_gin\s+on\s+public\.journal_entries\s+using\s+gin\s+\(tags\)/i.test(sql), 'Must define GIN index on journal_entries(tags)');
  assert.ok(/personal_notes_tags_gin\s+on\s+public\.personal_notes\s+using\s+gin\s+\(tags\)/i.test(sql), 'Must define GIN index on personal_notes(tags)');

  // Journal entries user + entry_date desc + created_at desc index
  assert.ok(
    /journal_entries_user_date_idx\s+on\s+public\.journal_entries\s+\(user_id,\s*entry_date\s+desc,\s*created_at\s+desc\)/i.test(sql),
    'Must index (user_id, entry_date desc, created_at desc)'
  );

  // Draft and mood indexes
  assert.ok(sql.includes('journal_entries_user_mood_idx'), 'Must index (user_id, mood)');
  assert.ok(sql.includes('journal_entries_user_draft_idx'), 'Must index (user_id, is_draft)');

  // Personal notes user + pinned index
  assert.ok(/personal_notes_user_pinned_idx\s+on\s+public\.personal_notes\s+\(user_id,\s*is_pinned\s+desc,\s*updated_at\s+desc\)/i.test(sql), 'Must index (user_id, is_pinned desc, updated_at desc)');

  // Junction indexes
  assert.ok(/journal_movies_journal_idx\s+on\s+public\.journal_movie_relations\s+\(journal_entry_id\)/i.test(sql), 'Must index journal_entry_id');
  assert.ok(/journal_movies_movie_idx\s+on\s+public\.journal_movie_relations\s+\(movie_id\)/i.test(sql), 'Must index movie_id');
  assert.ok(/journal_movies_user_idx\s+on\s+public\.journal_movie_relations\s+\(user_id\)/i.test(sql), 'Must index user_id');
});

test('Row Level Security (RLS): All tables enforce authenticated-only access scoped to auth.uid()', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Verify RLS enabled on all 3 new tables
  assert.ok(sql.includes('alter table public.journal_entries enable row level security;'), 'Must enable RLS on journal_entries');
  assert.ok(sql.includes('alter table public.journal_movie_relations enable row level security;'), 'Must enable RLS on journal_movie_relations');
  assert.ok(sql.includes('alter table public.personal_notes enable row level security;'), 'Must enable RLS on personal_notes');

  // Policies for journal_entries
  assert.ok(sql.includes('create policy "Users can select own journal entries"'), 'Must have SELECT policy for journal_entries');
  assert.ok(sql.includes('create policy "Users can insert own journal entries"'), 'Must have INSERT policy for journal_entries');
  assert.ok(sql.includes('create policy "Users can update own journal entries"'), 'Must have UPDATE policy for journal_entries');
  assert.ok(sql.includes('create policy "Users can delete own journal entries"'), 'Must have DELETE policy for journal_entries');

  // Update check prevents changing user_id
  assert.ok(
    /create policy "Users can update own journal entries"[\s\S]+?using\s*\(user_id\s*=\s*auth\.uid\(\)\)[\s\S]+?with check\s*\(user_id\s*=\s*auth\.uid\(\)\)/i.test(sql),
    'Update policy on journal_entries must enforce with check (user_id = auth.uid())'
  );

  // Cross-user RLS check on journal_movie_relations
  assert.ok(sql.includes('create policy "Users can insert own journal movie relations"'), 'Must have INSERT policy for relations');
  assert.ok(sql.includes('select 1 from public.movies m'), 'Relations policy must verify movie ownership');
  assert.ok(sql.includes('select 1 from public.journal_entries j'), 'Relations policy must verify journal ownership');

  // Privilege hardening
  assert.ok(sql.includes('revoke all on public.journal_entries from anon, public;'), 'Must revoke privileges from anon/public');
  assert.ok(sql.includes('grant select, insert, update, delete on public.journal_entries to authenticated;'), 'Must grant to authenticated');
});

test('Integration Simulation: Draft vs Published content constraints at database boundary', () => {
  // Simulate Postgres CHECK:
  // char_length(content) <= 50000 AND (is_draft = true OR char_length(trim(content)) >= 1)
  function checkJournalContent(content, isDraft) {
    if (content === null || content === undefined) return false;
    if (content.length > 50000) return false;
    if (isDraft === true) return true;
    return content.trim().length >= 1;
  }

  // Drafts: empty string and whitespace are valid
  assert.equal(checkJournalContent('', true), true, 'Draft with empty content must be allowed');
  assert.equal(checkJournalContent('   ', true), true, 'Draft with whitespace content must be allowed');
  assert.equal(checkJournalContent('Some draft text', true), true, 'Draft with text must be allowed');

  // Published: empty string and whitespace are strictly rejected
  assert.equal(checkJournalContent('', false), false, 'Published entry with empty content must be rejected');
  assert.equal(checkJournalContent('   ', false), false, 'Published entry with whitespace content must be rejected');
  assert.equal(checkJournalContent('A single letter', false), true, 'Published entry with text must be allowed');

  // Exceeding 50,000 characters is rejected for both
  const hugeText = 'x'.repeat(50001);
  assert.equal(checkJournalContent(hugeText, true), false, 'Draft exceeding 50,000 characters must be rejected');
  assert.equal(checkJournalContent(hugeText, false), false, 'Published exceeding 50,000 characters must be rejected');
});

test('Integration Simulation: Multi-User Security & Cross-Ownership Boundary Test', () => {
  const USER_A = '11111111-1111-4111-8111-111111111111';
  const USER_B = '22222222-2222-4222-8222-222222222222';

  // Mock Database State
  const db = {
    movies: [
      { id: 'movie-a1', user_id: USER_A, title: 'Film User A' },
      { id: 'movie-b1', user_id: USER_B, title: 'Film User B' }
    ],
    journal_entries: [
      { id: 'journal-a1', user_id: USER_A, title: 'Jurnal User A', content: 'Isi A', is_draft: false },
      { id: 'journal-b1', user_id: USER_B, title: 'Jurnal User B', content: 'Isi B', is_draft: false }
    ],
    journal_movie_relations: [],
    personal_notes: [
      { id: 'note-a1', user_id: USER_A, title: '', content: 'Note A' },
      { id: 'note-b1', user_id: USER_B, title: '', content: 'Note B' }
    ]
  };

  // 1. SELECT isolation under RLS: user_id = auth.uid()
  function rlsSelect(table, authUid) {
    return db[table].filter(row => row.user_id === authUid);
  }

  const userAJournals = rlsSelect('journal_entries', USER_A);
  assert.equal(userAJournals.length, 1);
  assert.equal(userAJournals[0].id, 'journal-a1');
  assert.ok(!userAJournals.some(j => j.user_id === USER_B), 'User A cannot view User B journals');

  const userBNotes = rlsSelect('personal_notes', USER_B);
  assert.equal(userBNotes.length, 1);
  assert.equal(userBNotes[0].id, 'note-b1');
  assert.ok(!userBNotes.some(n => n.user_id === USER_A), 'User B cannot view User A notes');

  // 2. UPDATE ownership mutation attempt: user A attempts to set user_id to user B
  function rlsUpdateJournal(entry, authUid, newValues) {
    // using (user_id = auth.uid())
    if (entry.user_id !== authUid) {
      throw new Error('RLS: Using check failed (not owner)');
    }
    // with check (user_id = auth.uid())
    if (newValues.user_id && newValues.user_id !== authUid) {
      throw new Error('RLS: With check failed (cannot mutate user_id)');
    }
    return { ...entry, ...newValues };
  }

  assert.throws(
    () => rlsUpdateJournal(db.journal_entries[1], USER_A, { title: 'Hacked' }),
    /RLS: Using check failed/,
    'User A cannot update User B entry'
  );

  assert.throws(
    () => rlsUpdateJournal(db.journal_entries[0], USER_A, { user_id: USER_B }),
    /RLS: With check failed/,
    'User A cannot transfer entry ownership to User B'
  );

  // 3. Trigger & RLS Cross-Ownership Validation on Relations
  function validateRelationTrigger(relation) {
    const journal = db.journal_entries.find(j => j.id === relation.journal_entry_id && j.user_id === relation.user_id);
    if (!journal) {
      const err = new Error('Cross-ownership error: journal entry does not belong to the user.');
      err.code = 'P0001';
      throw err;
    }

    const movie = db.movies.find(m => m.id === relation.movie_id && m.user_id === relation.user_id);
    if (!movie) {
      const err = new Error('Cross-ownership error: movie does not belong to the user.');
      err.code = 'P0002';
      throw err;
    }
    return true;
  }

  // Valid relation: User A links User A's journal to User A's movie
  const validRelA = {
    journal_entry_id: 'journal-a1',
    movie_id: 'movie-a1',
    user_id: USER_A
  };
  assert.equal(validateRelationTrigger(validRelA), true);

  // Attack 1: User A tries to link User B's journal to User A's movie
  const invalidRelJournal = {
    journal_entry_id: 'journal-b1',
    movie_id: 'movie-a1',
    user_id: USER_A
  };
  assert.throws(
    () => validateRelationTrigger(invalidRelJournal),
    (err) => err.code === 'P0001',
    'Must fail with error code P0001 when journal belongs to another user'
  );

  // Attack 2: User A tries to link User A's journal to User B's movie
  const invalidRelMovie = {
    journal_entry_id: 'journal-a1',
    movie_id: 'movie-b1',
    user_id: USER_A
  };
  assert.throws(
    () => validateRelationTrigger(invalidRelMovie),
    (err) => err.code === 'P0002',
    'Must fail with error code P0002 when movie belongs to another user'
  );

  // Attack 3: User A tries to insert relation with User B's identity
  function rlsInsertRelation(relation, authUid) {
    if (relation.user_id !== authUid) {
      throw new Error('RLS: user_id does not match auth.uid()');
    }
    return validateRelationTrigger(relation);
  }

  assert.throws(
    () => rlsInsertRelation({ journal_entry_id: 'journal-b1', movie_id: 'movie-b1', user_id: USER_B }, USER_A),
    /RLS: user_id does not match auth.uid\(\)/,
    'User A cannot forge user_id = USER_B during relation creation'
  );
});
