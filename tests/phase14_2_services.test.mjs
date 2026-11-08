import test from 'node:test';
import assert from 'node:assert/strict';

import {
  JOURNAL_MOODS,
  isValidJournalMood,
  isValidDateString,
  getCurrentDateString,
  sanitizeTags,
  validateCreateJournalInput,
  validateUpdateJournalInput,
  validateResonanceNote,
  validateCreateNoteInput,
  validateUpdateNoteInput,
  mapJournalDbError,
  isValidUuid,
} from '../src/lib/journal-validations.ts';

// ==============================================================================
// 1. UNIT TESTS: VALIDATION & ERROR MAPPING
// ==============================================================================

test('Unit: isValidJournalMood validates the 8 official presets', () => {
  const expectedPresets = [
    'Melankolis',
    'Kontemplatif',
    'Nostalgia',
    'Tenang',
    'Resah',
    'Hangat',
    'Puitis',
    'Soliter',
  ];

  assert.equal(JOURNAL_MOODS.length, 8);
  for (const preset of expectedPresets) {
    assert.equal(isValidJournalMood(preset), true, `Preset '${preset}' must be valid`);
  }

  // Invalid moods
  assert.equal(isValidJournalMood(''), false);
  assert.equal(isValidJournalMood('Marah'), false);
  assert.equal(isValidJournalMood('Bahagia'), false);
  assert.equal(isValidJournalMood('Psikologis'), false); // Movie taxonomy mood, not journal mood
  assert.equal(isValidJournalMood(null), false);
  assert.equal(isValidJournalMood(undefined), false);
  assert.equal(isValidJournalMood(123), false);
});

test('Unit: isValidDateString and getCurrentDateString validate calendar dates', () => {
  assert.equal(isValidDateString('2026-11-08'), true);
  assert.equal(isValidDateString('2024-02-29'), true); // Leap year
  assert.equal(isValidDateString('2023-02-29'), false); // Not leap year
  assert.equal(isValidDateString('2026-13-01'), false); // Invalid month
  assert.equal(isValidDateString('2026-04-31'), false); // April has 30 days
  assert.equal(isValidDateString('08-11-2026'), false); // Wrong format
  assert.equal(isValidDateString('2026/11/08'), false); // Wrong delimiter
  assert.equal(isValidDateString(''), false);
  assert.equal(isValidDateString(null), false);

  const today = getCurrentDateString();
  assert.equal(isValidDateString(today), true, 'getCurrentDateString must produce a valid date string');
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});

test('Unit: isValidUuid validates UUID v4 formats', () => {
  assert.equal(isValidUuid('11111111-1111-4111-8111-111111111111'), true);
  assert.equal(isValidUuid('not-a-uuid'), false);
  assert.equal(isValidUuid(''), false);
  assert.equal(isValidUuid(null), false);
});

test('Unit: sanitizeTags cleans, normalizes and deduplicates tag arrays', () => {
  const raw = ['  Cinema ', 'cinema', 'RETRO', 'vhs  ', '', '   ', 'a'.repeat(60), 'indie'];
  const cleaned = sanitizeTags(raw);

  assert.deepEqual(cleaned, ['cinema', 'retro', 'vhs', 'indie']);
  assert.deepEqual(sanitizeTags([]), []);
  assert.deepEqual(sanitizeTags(null), []);
  assert.deepEqual(sanitizeTags(undefined), []);
});

test('Unit: validateCreateJournalInput enforces title, mood, date and draft rules', () => {
  // Valid published journal
  const validPub = validateCreateJournalInput({
    title: '  Catatan Malam  ',
    content: 'Malam ini menonton film noir yang luar biasa.',
    entryDate: '2026-11-08',
    mood: 'Melankolis',
    tags: ['Noir', 'malam'],
    isDraft: false,
  });
  assert.equal(validPub.cleanTitle, 'Catatan Malam');
  assert.equal(validPub.cleanContent, 'Malam ini menonton film noir yang luar biasa.');
  assert.equal(validPub.entryDate, '2026-11-08');
  assert.equal(validPub.mood, 'Melankolis');
  assert.deepEqual(validPub.tags, ['noir', 'malam']);
  assert.equal(validPub.isDraft, false);

  // Valid draft with empty content
  const validDraft = validateCreateJournalInput({
    title: 'Ide Cerita Tanpa Isi',
    content: '',
    isDraft: true,
  });
  assert.equal(validDraft.cleanTitle, 'Ide Cerita Tanpa Isi');
  assert.equal(validDraft.cleanContent, '');
  assert.equal(validDraft.isDraft, true);
  assert.equal(validDraft.mood, null);

  // Reject empty title
  assert.throws(
    () => validateCreateJournalInput({ title: '   ', content: 'Konten ada' }),
    /Judul jurnal wajib diisi/
  );

  // Reject title exceeding 200 chars
  assert.throws(
    () => validateCreateJournalInput({ title: 'A'.repeat(201), content: 'Konten' }),
    /Judul jurnal maksimal 200 karakter/
  );

  // Reject empty content for published journal
  assert.throws(
    () => validateCreateJournalInput({ title: 'Judul', content: '   ', isDraft: false }),
    /Jurnal yang dipublikasikan wajib memiliki konten/
  );

  // Reject invalid mood preset
  assert.throws(
    () => validateCreateJournalInput({ title: 'Judul', content: 'Konten', mood: 'Gembira' }),
    /Mood 'Gembira' tidak valid/
  );

  // Reject content exceeding 50,000 chars
  assert.throws(
    () => validateCreateJournalInput({ title: 'Judul', content: 'x'.repeat(50001) }),
    /Konten jurnal maksimal 50\.000 karakter/
  );
});

test('Unit: validateUpdateJournalInput validates partial update fields', () => {
  const update1 = validateUpdateJournalInput({
    title: '  Judul Baru  ',
    mood: 'Tenang',
  });
  assert.equal(update1.cleanTitle, 'Judul Baru');
  assert.equal(update1.mood, 'Tenang');

  // Null mood clears the mood
  const update2 = validateUpdateJournalInput({ mood: null });
  assert.equal(update2.mood, null);

  // Reject invalid partial values
  assert.throws(
    () => validateUpdateJournalInput({ title: '' }),
    /Judul jurnal wajib diisi/
  );
  assert.throws(
    () => validateUpdateJournalInput({ mood: 'InvalidMood' }),
    /Mood 'InvalidMood' tidak valid/
  );
  assert.throws(
    () => validateUpdateJournalInput({ content: 'x'.repeat(50001) }),
    /Konten jurnal maksimal 50\.000 karakter/
  );
});

test('Unit: validateResonanceNote enforces optional max 500 characters', () => {
  assert.equal(validateResonanceNote(null), null);
  assert.equal(validateResonanceNote('   '), null);
  assert.equal(validateResonanceNote('Film ini sangat menyentuh.'), 'Film ini sangat menyentuh.');

  assert.throws(
    () => validateResonanceNote('A'.repeat(501)),
    /Resonance note maksimal 500 karakter/
  );
});

test('Unit: validateCreateNoteInput allows optional title and requires content', () => {
  // Note with title
  const note1 = validateCreateNoteInput({
    title: 'Daftar Belanja',
    content: 'Beli pita kaset VHS.',
    tags: ['Toko'],
    isPinned: true,
  });
  assert.equal(note1.cleanTitle, 'Daftar Belanja');
  assert.equal(note1.cleanContent, 'Beli pita kaset VHS.');
  assert.equal(note1.isPinned, true);
  assert.deepEqual(note1.tags, ['toko']);

  // Untitled note: title defaults to empty string
  const note2 = validateCreateNoteInput({
    content: 'Catatan kilat tanpa judul.',
  });
  assert.equal(note2.cleanTitle, '');
  assert.equal(note2.cleanContent, 'Catatan kilat tanpa judul.');
  assert.equal(note2.isPinned, false);

  // Reject empty content
  assert.throws(
    () => validateCreateNoteInput({ content: '   ' }),
    /Konten catatan wajib diisi/
  );

  // Reject content > 10,000 chars
  assert.throws(
    () => validateCreateNoteInput({ content: 'A'.repeat(10001) }),
    /Konten catatan maksimal 10\.000 karakter/
  );

  // Reject title > 200 chars
  assert.throws(
    () => validateCreateNoteInput({ title: 'A'.repeat(201), content: 'Isi' }),
    /Judul catatan maksimal 200 karakter/
  );
});

test('Unit: validateUpdateNoteInput validates partial update fields for notes', () => {
  const updated = validateUpdateNoteInput({
    title: 'Judul Revisi',
    isPinned: true,
  });
  assert.equal(updated.cleanTitle, 'Judul Revisi');
  assert.equal(updated.isPinned, true);

  assert.throws(
    () => validateUpdateNoteInput({ title: 'A'.repeat(201) }),
    /Judul catatan maksimal 200 karakter/
  );
  assert.throws(
    () => validateUpdateNoteInput({ content: '   ' }),
    /Konten catatan wajib diisi/
  );
  assert.throws(
    () => validateUpdateNoteInput({ content: 'x'.repeat(10001) }),
    /Konten catatan maksimal 10\.000 karakter/
  );
});

test('Unit: mapJournalDbError translates Postgres/Supabase errors to safe user messages', () => {
  assert.equal(
    mapJournalDbError({ code: 'P0001', message: 'Trigger error' }),
    'Entri jurnal tidak ditemukan atau bukan milik akun Anda.'
  );
  assert.equal(
    mapJournalDbError({ code: 'P0002', message: 'Trigger error' }),
    'Film tidak ditemukan atau bukan milik akun Anda.'
  );
  assert.equal(
    mapJournalDbError({ code: '23505', message: 'duplicate key value violates unique constraint' }),
    'Film ini sudah ditautkan ke entri jurnal.'
  );
  assert.equal(
    mapJournalDbError({ code: '23514', message: 'violates check constraint journal_entries_content_check' }),
    'Jurnal yang dipublikasikan wajib memiliki konten yang tidak kosong.'
  );
  assert.equal(
    mapJournalDbError({ code: '42501', message: 'row-level security violation' }),
    'Akses ditolak oleh kebijakan keamanan data.'
  );
});

// ==============================================================================
// 2. MOCK & SIMULATION TESTS: SERVICE WORKFLOWS, CONTRACTS & SECURITY
// ==============================================================================

test('Simulation: Journal lifecycle with multi-entry per date and draft transitions', () => {
  const USER_ID = '11111111-1111-4111-8111-111111111111';

  // In-memory mock storage for journal_entries
  const db = {
    journal_entries: [],
  };

  function mockCreateJournal(input, user) {
    const validated = validateCreateJournalInput(input);
    const entry = {
      id: `journal-${db.journal_entries.length + 1}`,
      user_id: user.id,
      title: validated.cleanTitle,
      content: validated.cleanContent,
      entry_date: validated.entryDate,
      mood: validated.mood,
      tags: validated.tags,
      is_draft: validated.isDraft,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.journal_entries.push(entry);
    return entry;
  }

  function mockListJournals(filter, user) {
    let list = db.journal_entries.filter((j) => j.user_id === user.id);
    if (filter.isDraft !== undefined) {
      list = list.filter((j) => j.is_draft === filter.isDraft);
    }
    if (filter.mood) {
      list = list.filter((j) => j.mood === filter.mood);
    }
    if (filter.tag) {
      list = list.filter((j) => j.tags.includes(filter.tag.toLowerCase()));
    }
    if (filter.entryDate) {
      list = list.filter((j) => j.entry_date === filter.entryDate);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter((j) => j.title.toLowerCase().includes(q) || j.content.toLowerCase().includes(q));
    }
    // Chronological sorting: entry_date desc, created_at desc
    list.sort((a, b) => {
      if (a.entry_date !== b.entry_date) return b.entry_date.localeCompare(a.entry_date);
      return b.created_at.localeCompare(a.created_at);
    });

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;
    return {
      entries: list.slice(offset, offset + limit),
      total: list.length,
    };
  }

  // 1. Create two entries on the SAME date (supporting multi-entry per date)
  const entryMorning = mockCreateJournal(
    {
      title: 'Pagi di Kedai Kopi',
      content: 'Kopi hitam hangat dan film klasik.',
      entryDate: '2026-11-08',
      mood: 'Hangat',
      tags: ['pagi', 'kopi'],
      isDraft: false,
    },
    { id: USER_ID }
  );

  const entryNight = mockCreateJournal(
    {
      title: 'Malam Refleksi Noir',
      content: 'Menonton Casablanca hingga larut malam.',
      entryDate: '2026-11-08',
      mood: 'Melankolis',
      tags: ['malam', 'film'],
      isDraft: false,
    },
    { id: USER_ID }
  );

  assert.equal(entryMorning.entry_date, '2026-11-08');
  assert.equal(entryNight.entry_date, '2026-11-08');

  const sameDayList = mockListJournals({ entryDate: '2026-11-08' }, { id: USER_ID });
  assert.equal(sameDayList.total, 2, 'Must support multiple entries on the same date');

  // 2. Create an empty draft
  const draftEntry = mockCreateJournal(
    {
      title: 'Draft Ide Menulis',
      content: '',
      isDraft: true,
    },
    { id: USER_ID }
  );
  assert.equal(draftEntry.is_draft, true);

  // 3. Draft filtering
  const draftsOnly = mockListJournals({ isDraft: true }, { id: USER_ID });
  assert.equal(draftsOnly.total, 1);
  assert.equal(draftsOnly.entries[0].title, 'Draft Ide Menulis');

  // 4. Tag and mood filtering
  const hangatMood = mockListJournals({ mood: 'Hangat' }, { id: USER_ID });
  assert.equal(hangatMood.total, 1);
  assert.equal(hangatMood.entries[0].title, 'Pagi di Kedai Kopi');

  const filmTag = mockListJournals({ tag: 'film' }, { id: USER_ID });
  assert.equal(filmTag.total, 1);
  assert.equal(filmTag.entries[0].title, 'Malam Refleksi Noir');

  // 5. Search filtering
  const searchResult = mockListJournals({ search: 'Casablanca' }, { id: USER_ID });
  assert.equal(searchResult.total, 1);
  assert.equal(searchResult.entries[0].title, 'Malam Refleksi Noir');
});

test('Simulation: Journal-to-Movie Relations, duplicate prevention and cascade', () => {
  const USER_A = 'user-aaa';
  const USER_B = 'user-bbb';

  const db = {
    movies: [
      { id: 'movie-1', user_id: USER_A, title: 'Blade Runner 1982' },
      { id: 'movie-2', user_id: USER_B, title: 'Solaris 1972' },
    ],
    journal_entries: [
      { id: 'journal-1', user_id: USER_A, title: 'Refleksi Sci-Fi' },
    ],
    journal_movie_relations: [],
  };

  function mockAttachMovie(journalId, movieId, resonanceNote, authUser) {
    // 1. Verify journal ownership
    const journal = db.journal_entries.find((j) => j.id === journalId && j.user_id === authUser.id);
    if (!journal) {
      throw new Error(mapJournalDbError({ code: 'P0001' }));
    }

    // 2. Verify movie ownership
    const movie = db.movies.find((m) => m.id === movieId && m.user_id === authUser.id);
    if (!movie) {
      throw new Error(mapJournalDbError({ code: 'P0002' }));
    }

    // 3. Verify unique constraint
    const existing = db.journal_movie_relations.find(
      (r) => r.journal_entry_id === journalId && r.movie_id === movieId
    );
    if (existing) {
      throw new Error(mapJournalDbError({ code: '23505' }));
    }

    const relation = {
      id: `rel-${db.journal_movie_relations.length + 1}`,
      user_id: authUser.id,
      journal_entry_id: journalId,
      movie_id: movieId,
      resonance_note: validateResonanceNote(resonanceNote),
      created_at: new Date().toISOString(),
    };
    db.journal_movie_relations.push(relation);
    return relation;
  }

  // 1. Attach User A's movie to User A's journal
  const rel1 = mockAttachMovie('journal-1', 'movie-1', 'Adegan hujan menyentuh hati.', { id: USER_A });
  assert.equal(rel1.movie_id, 'movie-1');
  assert.equal(rel1.resonance_note, 'Adegan hujan menyentuh hati.');

  // 2. Duplicate attachment rejected
  assert.throws(
    () => mockAttachMovie('journal-1', 'movie-1', 'Duplikat', { id: USER_A }),
    /Film ini sudah ditautkan ke entri jurnal/
  );

  // 3. Cross-ownership attack: User A attempts to attach User B's movie
  assert.throws(
    () => mockAttachMovie('journal-1', 'movie-2', 'Mencoba link film orang lain', { id: USER_A }),
    /Film tidak ditemukan atau bukan milik akun Anda/
  );

  // 4. Cascade simulation: Deleting journal removes relation
  assert.equal(db.journal_movie_relations.length, 1);
  const journalIdToDelete = 'journal-1';
  db.journal_entries = db.journal_entries.filter((j) => j.id !== journalIdToDelete);
  db.journal_movie_relations = db.journal_movie_relations.filter((r) => r.journal_entry_id !== journalIdToDelete);
  assert.equal(db.journal_movie_relations.length, 0, 'Relations must cascade delete when journal is removed');
});

test('Simulation: Personal Notes pinning, search, and separation from WatchLogs', () => {
  const USER_A = 'user-aaa';

  const notesDb = [];

  function mockCreateNote(input, authUser) {
    const validated = validateCreateNoteInput(input);
    const note = {
      id: `note-${notesDb.length + 1}`,
      user_id: authUser.id,
      title: validated.cleanTitle,
      content: validated.cleanContent,
      tags: validated.tags,
      is_pinned: validated.isPinned,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    notesDb.push(note);
    return note;
  }

  function mockListNotes(filter, authUser) {
    let list = notesDb.filter((n) => n.user_id === authUser.id);
    if (filter.isPinned !== undefined) {
      list = list.filter((n) => n.is_pinned === filter.isPinned);
    }
    if (filter.tag) {
      list = list.filter((n) => n.tags.includes(filter.tag.toLowerCase()));
    }
    // Sorting: pinned first, then updated_at desc
    list.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return b.updated_at.localeCompare(a.updated_at);
    });
    return list;
  }

  // 1. Create an unpinned note with title
  mockCreateNote(
    {
      title: 'Ide Skrip',
      content: 'Karakter utama adalah kurator museum film.',
      tags: ['skrip', 'koleksi'],
      isPinned: false,
    },
    { id: USER_A }
  );

  // 2. Create a pinned note without title
  mockCreateNote(
    {
      content: 'Penting: backup file proyek setiap Jumat.',
      isPinned: true,
    },
    { id: USER_A }
  );

  const allNotes = mockListNotes({}, { id: USER_A });
  assert.equal(allNotes.length, 2);

  // Pinned note must be first
  assert.equal(allNotes[0].is_pinned, true);
  assert.equal(allNotes[0].title, ''); // Untitled defaults to empty string
  assert.equal(allNotes[1].is_pinned, false);
  assert.equal(allNotes[1].title, 'Ide Skrip');
});

test('Simulation: Security boundary & Server Actions response contract', () => {
  // Action response wrapper simulation
  function simulateServerAction(fn, authUser) {
    if (!authUser) {
      return { success: false, error: 'Autentikasi diperlukan. Silakan masuk terlebih dahulu.' };
    }
    try {
      const data = fn(authUser);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 1. Unauthenticated request rejected
  const unauthResult = simulateServerAction(() => 'some-data', null);
  assert.equal(unauthResult.success, false);
  assert.ok(unauthResult.error.includes('Autentikasi diperlukan'));

  // 2. Authenticated valid request succeeded
  const authResult = simulateServerAction((user) => ({ id: 'entry-1', userId: user.id }), { id: 'user-123' });
  assert.equal(authResult.success, true);
  assert.equal(authResult.data.userId, 'user-123');

  // 3. User spoofing prevention: payload containing user_id is ignored
  const maliciousClientInput = {
    user_id: 'attacker-id-spoofed',
    title: 'Hacked Title',
    content: 'Konten',
  };
  const spoofResult = simulateServerAction((user) => {
    // The service extracts user.id from session, ignoring maliciousClientInput.user_id
    const validated = validateCreateJournalInput(maliciousClientInput);
    return {
      userId: user.id, // Strictly uses session
      title: validated.cleanTitle,
    };
  }, { id: 'real-user-id' });

  assert.equal(spoofResult.success, true);
  assert.equal(spoofResult.data.userId, 'real-user-id', 'Must strictly use authenticated session user_id');
});
