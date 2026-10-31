'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Movie } from '@/types';
import { PosterCover } from '@/components/PosterCover';
import { MovieCard } from '@/components/MovieCard';
import { EmptyState } from '@/components/EmptyState';
import { MoodChips } from '@/components/MoodChips';
import { Badge } from '@/components/Badge';
import { FilmStripDivider } from '@/components/FilmStripDivider';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface HomeViewProps {
  initialMovies?: Movie[];
  initialMoods?: string[];
}

export function HomeView({ initialMovies = [], initialMoods = [] }: HomeViewProps) {
  const [movies] = useState<Movie[]>(initialMovies);
  const [availableMoods] = useState<string[]>(initialMoods);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [shuffleKey, setShuffleKey] = useState(0);

  const handleToggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
    setShuffleKey((k) => k + 1);
  };

  const handleClearMoods = () => {
    setSelectedMoods([]);
    setShuffleKey((k) => k + 1);
  };

  const handleShuffle = () => {
    setShuffleKey((k) => k + 1);
  };

  // Filter unwatched movies based on selected moods
  const unwatchedCandidates = useMemo(() => {
    return movies.filter((m) => {
      if (m.done) return false;
      if (selectedMoods.length === 0) return true;
      return m.moods.some((mood) => selectedMoods.includes(mood));
    });
  }, [movies, selectedMoods]);

  // Curated Triple-Bill picks:
  // Deterministic on initial render (shuffleKey === 0) to guarantee React SSR/CSR hydration parity.
  const picks: Movie[] = useMemo(() => {
    if (unwatchedCandidates.length === 0) return [];
    if (shuffleKey === 0) {
      return unwatchedCandidates.slice(0, 3);
    }
    return shuffleArray(unwatchedCandidates).slice(0, 3);
  }, [unwatchedCandidates, shuffleKey]);

  // Statistics
  const stats = useMemo(() => {
    const total = movies.length;
    const watched = movies.filter((m) => m.done).length;
    const unwatched = total - watched;
    const withNotes = movies.filter((m) => m.log && m.log.notes).length;
    return { total, watched, unwatched, withNotes };
  }, [movies]);

  // Recently added movies (up to 6 latest)
  const recentlyAdded = useMemo(() => movies.slice(0, 6), [movies]);

  // Featured hero movie
  const featuredMovie = useMemo(() => {
    return unwatchedCandidates[0] || movies[0] || null;
  }, [unwatchedCandidates, movies]);

  const hasMoodFilter = selectedMoods.length > 0;

  return (
    <div className="space-y-12 sm:space-y-16 pb-8">
      {/* ─────────────────────────────────────────────────────────────
          TASK 1: HERO SECTION (Cinematic Editorial with VHS Touch)
         ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-line bg-surface/60 p-6 sm:p-8 lg:p-10 shadow-xl transition-colors">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-neon-magenta/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Greeting, Headlines & CTAs */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* OSD Status Bar */}
            <div className="flex items-center gap-2.5 flex-wrap mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary-bright font-pixel text-[10px] tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-magenta animate-pulse" />
                REC ● MOCAB HI-FI
              </span>
              <span className="text-[10px] font-pixel text-muted tracking-wider hidden sm:inline">
                BERUANG SASTRA ARCHIVE
              </span>
              <span className="text-[10px] font-pixel text-muted/60 tracking-wider ml-auto hidden lg:inline" aria-hidden="true">
                SP 120 MIN // CH 03
              </span>
            </div>

            {/* Editorial Headline */}
            <h1 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl text-text tracking-tight leading-[1.12]">
              Arsip Sinema Pribadi & Sahabat Riset Film.
            </h1>

            {/* Description */}
            <p className="text-muted text-sm sm:text-base mt-3 sm:mt-4 max-w-xl leading-relaxed">
              Ruang kurasi sinematik pribadi milik Beruang Sastra. Temukan kembali film-film tersimpan,
              saring berdasarkan suasana hati, dan catat analisis adegan untuk pengembangan riset esai film.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex items-center gap-3 mt-6 sm:mt-8 flex-wrap">
              <Link
                href="/bank"
                className="btn primary text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2"
              >
                <span>Jelajahi Movie Bank</span>
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                  <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
                </svg>
              </Link>

              <Link
                href="/add"
                className="btn secondary text-xs sm:text-sm px-4 py-2.5 rounded-xl"
              >
                + Tambah Film
              </Link>
            </div>
          </div>

          {/* Right Column: Featured Cinematic Poster Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            {featuredMovie ? (
              <div className="relative group/hero w-full max-w-[240px] sm:max-w-[270px]">
                {/* Vintage tape shadow glow */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-primary/30 to-neon-magenta/30 blur-lg opacity-60 group-hover/hero:opacity-100 transition-opacity duration-300" />

                <Link
                  href={`/bank/${featuredMovie.id}`}
                  className="relative block rounded-2xl overflow-hidden focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`Buka detail film ${featuredMovie.title}`}
                >
                  <PosterCover
                    title={featuredMovie.title}
                    identifier={featuredMovie.tmdbId || featuredMovie.id}
                    done={featuredMovie.done}
                    year={featuredMovie.year}
                    posterUrl={featuredMovie.posterUrl}
                    big
                    className="w-full shadow-2xl transition-transform duration-300 group-hover/hero:scale-[1.02]"
                  />

                  {/* Curatorial Callout Overlay Pill */}
                  <div className="absolute bottom-3 left-3 right-3 z-20 p-2.5 rounded-xl bg-surface/90 backdrop-blur-md border border-line flex items-center justify-between gap-2 shadow-lg">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-bright" />
                        <span className="font-pixel text-[9px] text-primary-bright uppercase tracking-wider">
                          NOW PLAYING
                        </span>
                      </div>
                      <h4 className="font-sans font-semibold text-xs text-text truncate mt-0.5">
                        {featuredMovie.title}
                      </h4>
                    </div>
                    <span className="font-pixel text-[10px] text-muted flex-none">
                      {featuredMovie.year}
                    </span>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="w-full max-w-[260px] aspect-[2/3] rounded-2xl border-2 border-dashed border-line bg-surface-elevated/40 flex flex-col items-center justify-center p-6 text-center text-muted">
                <Image
                  src="/brand/stickers/sticker-vhs.webp"
                  alt="VHS Tape"
                  width={64}
                  height={40}
                  className="mb-3 opacity-60"
                />
                <span className="font-pixel text-[10px] text-lavender uppercase mb-1">MOCAB TAPE</span>
                <p className="text-xs text-muted">Belum ada film di perpustakaan.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          TASK 5: COLLECTION OVERVIEW (Quick Stats Grid)
         ───────────────────────────────────────────────────────────── */}
      <section aria-label="Ringkasan Koleksi" className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <span className="font-pixel text-[10px] text-muted tracking-wider uppercase">
            TOTAL FILM
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-text">
              {stats.total}
            </span>
            <span className="text-xs text-muted">judul</span>
          </div>
        </div>

        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <span className="font-pixel text-[10px] text-ok tracking-wider uppercase">
            SUDAH DITONTON
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-ok">
              {stats.watched}
            </span>
            <span className="text-xs text-muted">selesai</span>
          </div>
        </div>

        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <span className="font-pixel text-[10px] text-primary-bright tracking-wider uppercase">
            WATCHLIST
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-primary-bright">
              {stats.unwatched}
            </span>
            <span className="text-xs text-muted">menunggu</span>
          </div>
        </div>

        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <span className="font-pixel text-[10px] text-neon-magenta tracking-wider uppercase">
            CATATAN RISET
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-neon-magenta">
              {stats.withNotes}
            </span>
            <span className="text-xs text-muted">ulasan</span>
          </div>
        </div>
      </section>

      {/* Film Strip Divider */}
      <FilmStripDivider label="CURATED // TRIPLE BILL" />

      {/* ─────────────────────────────────────────────────────────────
          TASK 3: TRIPLE BILL (Curated Editorial 3-Movie Recommendations)
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line/60 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="review" size="xs">
                CURATED PICKS
              </Badge>
              <span className="text-xs font-pixel text-muted tracking-wide">
                TRIPLE-BILL
              </span>
            </div>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-text tracking-tight">
              Pilihan Malam Ini
            </h2>
            <p className="text-muted text-xs sm:text-sm mt-1 max-w-lg">
              Tiga rekomendasi acak dari {stats.unwatched} film yang belum lu tonton untuk menemani sesi layar malam ini.
            </p>
          </div>

          {unwatchedCandidates.length > 1 && (
            <button
              type="button"
              onClick={handleShuffle}
              className="btn secondary text-xs self-start sm:self-auto flex items-center gap-2 cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]"
                aria-hidden="true"
              >
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
              <span>Acak Lagi</span>
            </button>
          )}
        </div>

        {/* Triple Bill Editorial Cards */}
        {picks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {picks.map((movie, index) => {
              const tapeNumber = `TAPE #0${index + 1}`;

              return (
                <div
                  key={movie.id}
                  className="card group/triple p-4 flex flex-col justify-between hover:border-primary/40"
                >
                  {/* Sequence Header */}
                  <div className="flex items-center justify-between text-[10px] font-pixel text-muted mb-3">
                    <span className="text-primary-bright font-bold">{tapeNumber}</span>
                    <span>{movie.year || 'N/A'}</span>
                  </div>

                  {/* Poster Showcase */}
                  <Link
                    href={`/bank/${movie.id}`}
                    className="block relative rounded-xl overflow-hidden focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <PosterCover
                      title={movie.title}
                      identifier={movie.tmdbId || movie.id}
                      done={movie.done}
                      year={movie.year}
                      posterUrl={movie.posterUrl}
                      className="transition-transform duration-300 group-hover/triple:scale-[1.02]"
                    />
                  </Link>

                  {/* Metadata & Mood Badges */}
                  <div className="mt-4 flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/bank/${movie.id}`}
                        className="block focus-visible:outline-2 focus-visible:outline-primary rounded-md"
                      >
                        <h3 className="font-serif font-bold text-base sm:text-lg text-text group-hover/triple:text-primary-bright transition-colors line-clamp-1">
                          {movie.title}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {movie.moods?.slice(0, 2).map((mood) => (
                          <span
                            key={mood}
                            className="text-[10px] font-pixel px-2 py-0.5 rounded-md bg-surface-elevated text-lavender border border-line/60"
                          >
                            #{mood}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-line/50 flex items-center justify-between text-xs text-muted">
                      <span>{movie.runtime ? `${movie.runtime}m durasi` : 'Durasi N/A'}</span>
                      <Link
                        href={`/bank/${movie.id}`}
                        className="text-primary-bright font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <span>Detail</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : movies.length === 0 ? (
          <EmptyState
            title="Kabin film masih kosong."
            description="Mulai simpan film pertama lu ke dalam perpustakaan untuk memunculkan rekomendasi Triple-Bill di sini."
            actionText="Tambah film baru"
            actionHref="/add"
            primaryAction
          />
        ) : (
          <EmptyState
            title={`Nggak ada film ${hasMoodFilter ? 'dengan mood tersebut ' : ''}yang belum ditonton.`}
            description="Coba pilih kombinasi mood lain atau simpan film baru ke dalam perpustakaan."
            actionText="Lepas Filter Mood"
            onAction={handleClearMoods}
          />
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          TASK 4: MOOD DISCOVERY (Atmospheric Tag Exploration)
         ───────────────────────────────────────────────────────────── */}
      {availableMoods.length > 0 && (
        <section className="card p-6 sm:p-7 border border-line/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="movie" size="xs">
                  DISCOVERY
                </Badge>
                <h3 className="font-serif font-bold text-xl text-text">
                  Eksplorasi Berdasarkan Suasana Hati
                </h3>
              </div>
              <p className="text-muted text-xs sm:text-sm">
                Saring rekomendasi film malam ini berdasarkan spektrum emosi dan tema kuratorial.
              </p>
            </div>

            {hasMoodFilter && (
              <button
                type="button"
                onClick={handleClearMoods}
                className="text-xs text-neon-magenta hover:underline font-medium self-start sm:self-auto cursor-pointer"
              >
                Lepas filter ({selectedMoods.length})
              </button>
            )}
          </div>

          <MoodChips
            moods={availableMoods}
            selectedMoods={selectedMoods}
            onToggle={handleToggleMood}
            wrap
          />
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TASK 2: RECENTLY ADDED (Quick Access Movie Grid)
         ───────────────────────────────────────────────────────────── */}
      {recentlyAdded.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div>
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-text">
                Baru Ditambahkan
              </h2>
              <p className="text-muted text-xs mt-0.5">
                Koleksi film terbaru yang tersimpan di Movie Cabin.
              </p>
            </div>
            <Link
              href="/bank"
              className="text-xs font-semibold text-primary-bright hover:underline inline-flex items-center gap-1"
            >
              <span>Lihat Semua ({movies.length})</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-5">
            {recentlyAdded.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          RESEARCH BANNER: Beruang Sastra Curatorial Callout
         ───────────────────────────────────────────────────────────── */}
      {movies.length > 0 && (
        <section className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-surface/80 to-surface-elevated/40 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-colors">
          {/* Subtle film ribbon sticker accent in corner */}
          <div className="absolute -right-4 -bottom-3 opacity-15 pointer-events-none hidden sm:block" aria-hidden="true">
            <Image
              src="/brand/stickers/sticker-film-ribbon.webp"
              alt=""
              width={120}
              height={36}
              className="w-28 h-auto object-contain"
            />
          </div>

          <div className="max-w-xl relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 flex items-center justify-center p-0.5 aspect-square flex-none">
                <Image
                  src="/brand/avatar-paw.webp"
                  alt=""
                  width={20}
                  height={20}
                  className="w-full h-full object-contain"
                  aria-hidden="true"
                />
              </div>
              <span className="font-pixel text-[10px] text-neon-magenta tracking-widest uppercase">
                RESEARCH COMPANION // BERUANG SASTRA
              </span>
            </div>
            <h3 className="font-serif font-bold text-xl sm:text-2xl text-text mt-1">
              Bukan Sekadar Watchlist Biasa
            </h3>
            <p className="text-muted text-xs sm:text-sm mt-2 leading-relaxed">
              MOCAB dirancang khusus untuk memetakan adegan berkesan, tema mendalam, dan potensi konten esai film. Buka Movie Bank untuk mencatat wawasan setiap kali usai menonton.
            </p>
          </div>

          <Link
            href="/bank"
            className="btn primary text-xs sm:text-sm px-5 py-2.5 rounded-xl self-start sm:self-center flex-none flex items-center gap-2 relative z-10"
          >
            <span>Buka Movie Bank</span>
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
              <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
            </svg>
          </Link>
        </section>
      )}
    </div>
  );
}
