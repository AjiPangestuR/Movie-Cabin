import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTmdbMovieDetail, isTmdbConfigured } from '@/lib/tmdb';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  // 1. Verifikasi sesi autentikasi Supabase
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Sesi tidak valid. Silakan login terlebih dahulu.' },
      { status: 401 }
    );
  }

  // 2. Cek apakah konfigurasi token server tersedia
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'NOT_CONFIGURED', message: 'Token akses TMDB belum dikonfigurasi pada server.' },
      { status: 503 }
    );
  }

  // 3. Validasi ID TMDB
  const { id } = await params;
  const tmdbId = parseInt(id, 10);

  if (isNaN(tmdbId) || tmdbId <= 0) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'ID film TMDB harus berupa bilangan bulat positif.' },
      { status: 400 }
    );
  }

  // 4. Panggil service detail TMDB
  try {
    const detail = await getTmdbMovieDetail(tmdbId);
    return NextResponse.json(detail);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengambil detail film dari TMDB.';
    const status = message.includes('tidak ditemukan') ? 404 : 502;
    return NextResponse.json({ error: 'TMDB_DETAIL_ERROR', message }, { status });
  }
}
