'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  type WatchSource,
  type AccessType,
  type CreateWatchSourceInput,
  type UpdateWatchSourceInput,
  type DetectedPlatform,
} from '@/types';
import {
  isValidUuid,
  validateCreateWatchSourceInput,
  validateUpdateWatchSourceInput,
  mapWatchSourceDbError,
  detectPlatformFromUrl,
} from '@/lib/watch-source-validations';

export { detectPlatformFromUrl };
export type { DetectedPlatform };

/**
 * Helper internal untuk mendapatkan authenticated user dari session Supabase.
 */
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Autentikasi diperlukan. Silakan masuk terlebih dahulu.');
  }

  return { supabase, user };
}

/**
 * Mapping baris tabel movie_watch_sources ke TypeScript interface WatchSource.
 */
function mapWatchSourceRow(row: {
  id: string;
  movie_id: string;
  user_id: string;
  platform_name: string;
  source_url: string | null;
  access_type: string;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}): WatchSource {
  return {
    id: row.id,
    movieId: row.movie_id,
    userId: row.user_id,
    platformName: row.platform_name,
    sourceUrl: row.source_url ?? null,
    accessType: row.access_type as AccessType,
    isPrimary: Boolean(row.is_primary),
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==============================================================================
// WATCH SOURCES SERVICES & SERVER ACTIONS
// ==============================================================================

/**
 * 1. Mendapatkan daftar sumber tontonan untuk sebuah film.
 * Memvalidasi kepemilikan film dan mengembalikan daftar terurut (primary first).
 */
export async function listWatchSources(movieId: string): Promise<WatchSource[]> {
  if (!movieId || !isValidUuid(movieId)) {
    throw new Error('ID film tidak valid.');
  }

  const { supabase, user } = await getAuthenticatedUser();

  // Validasi kepemilikan film (film harus milik user)
  const { data: movie, error: movieError } = await supabase
    .from('movies')
    .select('id')
    .eq('id', movieId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (movieError || !movie) {
    throw new Error('Film tidak ditemukan atau bukan milik akun Anda.');
  }

  const { data, error } = await supabase
    .from('movie_watch_sources')
    .select('*')
    .eq('movie_id', movieId)
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Gagal memuat sumber tontonan:', error.message);
    throw new Error(mapWatchSourceDbError(error, 'Gagal memuat sumber tontonan film.'));
  }

  return (data || []).map(mapWatchSourceRow);
}

/**
 * 2. Membuat sumber tontonan baru untuk sebuah film.
 * Jika sumber adalah yang pertama atau isPrimary = true, sumber akan dijadikan primary.
 */
export async function createWatchSource(
  input: CreateWatchSourceInput
): Promise<WatchSource> {
  const validated = validateCreateWatchSourceInput(input);
  const { supabase, user } = await getAuthenticatedUser();

  // Validasi kepemilikan film di server
  const { data: movie, error: movieError } = await supabase
    .from('movies')
    .select('id')
    .eq('id', validated.movieId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (movieError || !movie) {
    throw new Error('Film tidak ditemukan atau bukan milik akun Anda.');
  }

  // Cek jumlah sumber yang sudah ada untuk film ini
  const { count, error: countError } = await supabase
    .from('movie_watch_sources')
    .select('id', { count: 'exact', head: true })
    .eq('movie_id', validated.movieId)
    .eq('user_id', user.id);

  if (countError) {
    console.error('Gagal memeriksa jumlah sumber tontonan:', countError.message);
  }

  // Jika belum ada sumber sama sekali, otomatis jadikan primary
  let shouldBePrimary = validated.isPrimary;
  if (count === 0) {
    shouldBePrimary = true;
  }

  // Perlindungan Idempotensi & Anti-Duplikasi:
  // Jika sumber dengan URL yang sama sudah ada untuk film ini, kembalikan data existing
  if (validated.cleanSourceUrl) {
    const { data: existingSameUrl } = await supabase
      .from('movie_watch_sources')
      .select('*')
      .eq('movie_id', validated.movieId)
      .eq('user_id', user.id)
      .eq('source_url', validated.cleanSourceUrl)
      .maybeSingle();

    if (existingSameUrl) {
      if (shouldBePrimary && !existingSameUrl.is_primary) {
        return await setPrimaryWatchSource(existingSameUrl.id);
      }
      return mapWatchSourceRow(existingSameUrl);
    }
  }

  // Jika sumber baru dijadikan primary dan sebelumnya sudah ada primary,
  // demote primary lama terlebih dahulu untuk menjaga konsistensi partial index
  if (shouldBePrimary && count && count > 0) {
    await supabase
      .from('movie_watch_sources')
      .update({ is_primary: false })
      .eq('movie_id', validated.movieId)
      .eq('user_id', user.id)
      .eq('is_primary', true);
  }

  const { data, error } = await supabase
    .from('movie_watch_sources')
    .insert({
      movie_id: validated.movieId,
      user_id: user.id,
      platform_name: validated.cleanPlatformName,
      source_url: validated.cleanSourceUrl,
      access_type: validated.accessType,
      is_primary: shouldBePrimary,
      notes: validated.cleanNotes,
    })
    .select()
    .single();

  if (error || !data) {
    // Tangani race condition pada partial unique index (error 23505)
    const errCode = (error as { code?: string })?.code;
    const errMsg = (error as { message?: string })?.message || '';
    if (
      (errCode === '23505' || errMsg.includes('movie_watch_sources_primary_unique')) &&
      shouldBePrimary
    ) {
      const { data: currentPrimary } = await supabase
        .from('movie_watch_sources')
        .select('*')
        .eq('movie_id', validated.movieId)
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (currentPrimary) {
        if (
          !validated.cleanSourceUrl ||
          currentPrimary.source_url === validated.cleanSourceUrl
        ) {
          return mapWatchSourceRow(currentPrimary);
        }
      }
    }

    console.error('Gagal menambahkan sumber tontonan:', error?.message);
    throw new Error(mapWatchSourceDbError(error, 'Gagal menambahkan sumber tontonan.'));
  }

  // Sinkronisasi dual-write ke movies.watch_url jika sumber baru adalah primary
  if (shouldBePrimary && validated.cleanSourceUrl) {
    await supabase
      .from('movies')
      .update({ watch_url: validated.cleanSourceUrl })
      .eq('id', validated.movieId)
      .eq('user_id', user.id);
  }

  revalidatePath(`/bank/${validated.movieId}`);
  revalidatePath('/bank');

  return mapWatchSourceRow(data);
}

/**
 * 3. Memperbarui informasi sumber tontonan yang ada.
 * Mendukung dual-write konsistensi ke movies.watch_url saat URL sumber primary diperbarui
 * atau sumber non-primary dialihkan menjadi primary.
 */
export async function updateWatchSource(
  id: string,
  input: UpdateWatchSourceInput
): Promise<WatchSource> {
  if (!id || !isValidUuid(id)) {
    throw new Error('ID sumber tontonan tidak valid.');
  }

  const validated = validateUpdateWatchSourceInput(input);
  const { supabase, user } = await getAuthenticatedUser();

  // Verifikasi keberadaan dan kepemilikan sumber tontonan
  const { data: existing, error: findError } = await supabase
    .from('movie_watch_sources')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error('Sumber tontonan tidak ditemukan atau bukan milik akun Anda.');
  }

  const wasPrimary = Boolean(existing.is_primary);
  const willBePrimary =
    validated.isPrimary !== undefined ? Boolean(validated.isPrimary) : wasPrimary;

  // 1. Jika sumber non-primary dialihkan menjadi primary,
  // jalankan pergantian primary melalui RPC set_primary_watch_source terlebih dahulu
  if (validated.isPrimary === true && !wasPrimary) {
    const { error: rpcError } = await supabase.rpc('set_primary_watch_source', {
      p_source_id: id,
    });

    if (rpcError) {
      console.warn('RPC set_primary_watch_source gagal, mencoba fallback manual:', rpcError.message);
      const { error: demoteError } = await supabase
        .from('movie_watch_sources')
        .update({ is_primary: false })
        .eq('movie_id', existing.movie_id)
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .neq('id', id);

      if (demoteError) {
        throw new Error(mapWatchSourceDbError(demoteError, 'Gagal mengalihkan sumber tontonan utama.'));
      }
    }
  }

  // 2. Siapkan payload update untuk movie_watch_sources
  const updatePayload: Record<string, unknown> = {};
  if (validated.cleanPlatformName !== undefined) {
    updatePayload.platform_name = validated.cleanPlatformName;
  }
  if (validated.cleanSourceUrl !== undefined) {
    updatePayload.source_url = validated.cleanSourceUrl;
  }
  if (validated.accessType !== undefined) {
    updatePayload.access_type = validated.accessType;
  }
  if (validated.isPrimary !== undefined) {
    updatePayload.is_primary = validated.isPrimary;
  }
  if (validated.cleanNotes !== undefined) {
    updatePayload.notes = validated.cleanNotes;
  }

  const { data, error } = await supabase
    .from('movie_watch_sources')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    console.error('Gagal memperbarui sumber tontonan:', error?.message);
    throw new Error(mapWatchSourceDbError(error, 'Gagal memperbarui sumber tontonan.'));
  }

  // 3. Sinkronisasi dual-write ke movies.watch_url jika sumber adalah primary aktif
  if (willBePrimary) {
    const targetWatchUrl = data.source_url ? data.source_url.trim() : null;
    const { error: legacySyncError } = await supabase
      .from('movies')
      .update({ watch_url: targetWatchUrl })
      .eq('id', existing.movie_id)
      .eq('user_id', user.id);

    if (legacySyncError) {
      console.error('Dual-write ke movies.watch_url gagal:', legacySyncError.message);
      throw new Error(
        'Sumber tontonan berhasil diperbarui, namun sinkronisasi tautan warisan gagal: ' +
          legacySyncError.message
      );
    }
  }

  revalidatePath(`/bank/${existing.movie_id}`);
  revalidatePath('/bank');

  return mapWatchSourceRow(data);
}

/**
 * 4. Menghapus sumber tontonan.
 * Jika sumber yang dihapus adalah primary dan masih ada sumber lain untuk film tersebut,
 * sumber tertua yang tersisa akan otomatis dipromosikan menjadi primary.
 */
export async function deleteWatchSource(
  id: string
): Promise<{ success: boolean; deletedId: string; newPrimaryId?: string; newPrimaryUrl?: string | null }> {
  if (!id || !isValidUuid(id)) {
    throw new Error('ID sumber tontonan tidak valid.');
  }

  const { supabase, user } = await getAuthenticatedUser();

  // Verifikasi keberadaan dan kepemilikan sumber tontonan
  const { data: existing, error: findError } = await supabase
    .from('movie_watch_sources')
    .select('id, movie_id, is_primary')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error('Sumber tontonan tidak ditemukan atau bukan milik akun Anda.');
  }

  // Jika yang dihapus adalah sumber primary, cari sumber pengganti
  let fallbackCandidateId: string | undefined;
  if (existing.is_primary) {
    const { data: remaining } = await supabase
      .from('movie_watch_sources')
      .select('id')
      .eq('movie_id', existing.movie_id)
      .eq('user_id', user.id)
      .neq('id', id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (remaining && remaining.length > 0) {
      fallbackCandidateId = remaining[0].id;
    }
  }

  // Hapus sumber dari database
  const { error: deleteError } = await supabase
    .from('movie_watch_sources')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Gagal menghapus sumber tontonan:', deleteError.message);
    throw new Error(mapWatchSourceDbError(deleteError, 'Gagal menghapus sumber tontonan.'));
  }

  // Promosikan sumber pengganti jika ada
  let newPrimaryId: string | undefined;
  let newPrimaryUrl: string | null = null;

  if (fallbackCandidateId) {
    const { error: promoteError } = await supabase
      .from('movie_watch_sources')
      .update({ is_primary: true })
      .eq('id', fallbackCandidateId)
      .eq('user_id', user.id);

    if (!promoteError) {
      newPrimaryId = fallbackCandidateId;

      const { data: promotedSource } = await supabase
        .from('movie_watch_sources')
        .select('source_url')
        .eq('id', fallbackCandidateId)
        .maybeSingle();

      if (promotedSource) {
        newPrimaryUrl = promotedSource.source_url ?? null;
        const { error: legacyError } = await supabase
          .from('movies')
          .update({ watch_url: newPrimaryUrl })
          .eq('id', existing.movie_id)
          .eq('user_id', user.id);

        if (legacyError) {
          console.warn('Gagal menyinkronkan movies.watch_url setelah suksesi primary:', legacyError.message);
        }
      }
    } else {
      console.warn('Gagal mempromosikan sumber pengganti menjadi primary:', promoteError.message);
    }
  } else if (existing.is_primary && !fallbackCandidateId) {
    // Tidak ada sumber pengganti yang tersisa, bersihkan kolom movies.watch_url
    newPrimaryUrl = null;
    const { error: clearLegacyError } = await supabase
      .from('movies')
      .update({ watch_url: null })
      .eq('id', existing.movie_id)
      .eq('user_id', user.id);

    if (clearLegacyError) {
      console.warn('Gagal membersihkan movies.watch_url saat primary terakhir dihapus:', clearLegacyError.message);
    }
  }

  revalidatePath(`/bank/${existing.movie_id}`);
  revalidatePath('/bank');

  return { success: true, deletedId: id, newPrimaryId, newPrimaryUrl };
}

/**
 * 5. Menetapkan sumber tontonan sebagai sumber utama (primary source).
 * Menggunakan PostgreSQL RPC set_primary_watch_source jika tersedia untuk atomisitas,
 * atau fallback transaksional yang aman.
 */
export async function setPrimaryWatchSource(id: string): Promise<WatchSource> {
  if (!id || !isValidUuid(id)) {
    throw new Error('ID sumber tontonan tidak valid.');
  }

  const { supabase, user } = await getAuthenticatedUser();

  // Verifikasi keberadaan dan kepemilikan sumber tontonan
  const { data: existing, error: findError } = await supabase
    .from('movie_watch_sources')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error('Sumber tontonan tidak ditemukan atau bukan milik akun Anda.');
  }

  // Jika sudah primary, langsung kembalikan
  if (existing.is_primary) {
    return mapWatchSourceRow(existing);
  }

  // Coba eksekusi melalui PostgreSQL function set_primary_watch_source
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'set_primary_watch_source',
    { p_source_id: id }
  );

  if (!rpcError && rpcData) {
    const targetUrl = existing.source_url ? existing.source_url.trim() : null;
    const { error: legacySyncError } = await supabase
      .from('movies')
      .update({ watch_url: targetUrl })
      .eq('id', existing.movie_id)
      .eq('user_id', user.id);

    if (legacySyncError) {
      console.error('Dual-write ke movies.watch_url gagal pada set_primary_watch_source:', legacySyncError.message);
      throw new Error(
        'Sumber tontonan utama berhasil dialihkan, namun sinkronisasi tautan warisan gagal: ' +
          legacySyncError.message
      );
    }
    revalidatePath(`/bank/${existing.movie_id}`);
    revalidatePath('/bank');
    return mapWatchSourceRow(rpcData);
  }

  // Fallback dua tahap jika RPC belum terdaftar atau mengalami kendala environment
  // 1. Demote sumber primary lama untuk film yang sama
  await supabase
    .from('movie_watch_sources')
    .update({ is_primary: false })
    .eq('movie_id', existing.movie_id)
    .eq('user_id', user.id)
    .eq('is_primary', true);

  // 2. Set sumber ini sebagai primary
  const { data, error } = await supabase
    .from('movie_watch_sources')
    .update({ is_primary: true })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    console.error('Gagal menetapkan sumber utama:', error?.message);
    throw new Error(mapWatchSourceDbError(error, 'Gagal menetapkan sumber tontonan utama.'));
  }

  const fallbackTargetUrl = data.source_url ? data.source_url.trim() : null;
  const { error: fallbackLegacyError } = await supabase
    .from('movies')
    .update({ watch_url: fallbackTargetUrl })
    .eq('id', existing.movie_id)
    .eq('user_id', user.id);

  if (fallbackLegacyError) {
    console.error('Dual-write ke movies.watch_url gagal pada fallback set_primary:', fallbackLegacyError.message);
    throw new Error(
      'Sumber tontonan utama berhasil dialihkan, namun sinkronisasi tautan warisan gagal: ' +
        fallbackLegacyError.message
    );
  }

  revalidatePath(`/bank/${existing.movie_id}`);
  revalidatePath('/bank');

  return mapWatchSourceRow(data);
}
