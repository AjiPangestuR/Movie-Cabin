import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchTmdbMovies, isTmdbConfigured } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
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
      {
        results: [],
        page: 1,
        totalPages: 0,
        totalResults: 0,
        source: 'not_configured',
        message: 'Token akses TMDB belum dikonfigurasi pada server.',
      },
      { status: 200 }
    );
  }

  // 3. Validasi parameter pencarian
  const searchParams = request.nextUrl.searchParams;
  const rawQuery = searchParams.get('query') || '';
  const query = rawQuery.trim();

  if (!query) {
    return NextResponse.json({
      results: [],
      page: 1,
      totalPages: 0,
      totalResults: 0,
      source: 'tmdb',
    });
  }

  if (query.length > 100) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Kata kunci pencarian maksimal 100 karakter.' },
      { status: 400 }
    );
  }

  const page = parseInt(searchParams.get('page') || '1', 10);
  const validPage = !isNaN(page) && page > 0 ? page : 1;

  // 4. Panggil service TMDB
  try {
    const data = await searchTmdbMovies(query, { page: validPage });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat mencari film di TMDB.';
    return NextResponse.json(
      { error: 'TMDB_UPSTREAM_ERROR', message },
      { status: 502 }
    );
  }
}
