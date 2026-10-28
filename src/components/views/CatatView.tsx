'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Movie } from '@/types';
import { saveLog } from '@/lib/movies';
import { NumberScale } from '@/components/NumberScale';
import { useToast } from '@/components/Toast';

interface CatatViewProps {
  movie: Movie;
}

export function CatatView({ movie }: CatatViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState<number | null>(movie.log?.rating ?? null);
  const [contentPotential, setContentPotential] = useState<number | null>(
    movie.log?.contentPotential ?? null
  );
  const [theme, setTheme] = useState(movie.log?.theme ?? '');
  const [scene, setScene] = useState(movie.log?.scene ?? '');
  const [angle, setAngle] = useState(movie.log?.angle ?? '');
  const [notes, setNotes] = useState(movie.log?.notes ?? '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating || !contentPotential) {
      showToast('Isi rating dan potensi konten dulu.', true);
      return;
    }

    setSubmitting(true);
    try {
      await saveLog(movie.id, {
        rating,
        contentPotential,
        theme,
        scene,
        angle,
        notes,
      });

      showToast('Catatan riset tersimpan ke Arsip.');
      router.push(`/bank/${movie.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan catatan.';
      showToast(msg, true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-2xl mx-auto">
      {/* Back / Cancel Navigation */}
      <nav aria-label="Navigasi pembatalan">
        <Link
          href={`/bank/${movie.id}`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted hover:text-accent transition-colors font-medium group"
        >
          <svg
            viewBox="0 0 16 16"
            className="w-3.5 h-3.5 fill-current transition-transform group-hover:-translate-x-0.5"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
          </svg>
          <span>Batal (Kembali ke detail film)</span>
        </Link>
      </nav>

      {/* Editorial Header */}
      <section className="border-b border-line/60 pb-6">
        <div className="flex items-center gap-2 mb-2 text-xs font-mono tracking-widest uppercase text-muted/70">
          <span>After Watch</span>
          <span className="text-muted/30">/</span>
          <span>Refleksi Sinematik</span>
        </div>
        <h1 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-text tracking-tight leading-tight">
          {movie.title}
        </h1>
        <p className="text-muted text-sm mt-1 leading-relaxed">
          Tangkap gagasan, impresi visual, dan angle konten sebelum emosi menontonnya menguap.
        </p>
      </section>

      {/* Reflection Form */}
      <form onSubmit={handleSave} className="space-y-6 sm:space-y-7">
        {/* Rating 1-10 Section */}
        <section className="panel space-y-3 bg-surface-elevated/60">
          <div className="flex items-baseline justify-between">
            <label className="!mt-0 text-xs font-mono uppercase tracking-wider text-muted">
              1. Rating Film <span className="text-danger">*</span>
            </label>
            <span className="text-xs font-mono text-muted/80">
              {rating ? `${rating} / 10` : 'Belum dipilih'}
            </span>
          </div>
          <p className="text-xs text-muted/70 -mt-1">
            Penilaian estetika personal (1 mengecewakan · 5 lumayan · 10 mahakarya personal).
          </p>
          <NumberScale
            value={rating}
            onChange={setRating}
            ariaLabelPrefix="Rating film"
          />
        </section>

        {/* Content Potential 1-10 Section */}
        <section className="panel space-y-3 bg-surface-elevated/60">
          <div className="flex items-baseline justify-between">
            <label className="!mt-0 text-xs font-mono uppercase tracking-wider text-muted">
              2. Potensi Menjadi Konten <span className="text-danger">*</span>
            </label>
            <span className="text-xs font-mono text-accent font-semibold">
              {contentPotential ? `${contentPotential} / 10` : 'Belum dipilih'}
            </span>
          </div>
          <p className="text-xs text-muted/70 -mt-1">
            Seberapa kaya film ini untuk dibedah (1 sulit diolah · 5 menarik · 10 bahan emas video essay).
          </p>
          <NumberScale
            value={contentPotential}
            onChange={setContentPotential}
            ariaLabelPrefix="Potensi konten"
          />
        </section>

        {/* Qualitative Research Notes */}
        <section className="panel space-y-5 bg-surface/50">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted border-b border-line/50 pb-2">
            3. Analisis & Catatan Penulis
          </h2>

          {/* Theme */}
          <div className="space-y-1.5">
            <label htmlFor="f-theme" className="!mt-0 text-xs font-medium text-text-subtle">
              Tema Utama
            </label>
            <input
              type="text"
              id="f-theme"
              placeholder="Misal: kesepian urban, trauma masa kecil, rekonstruksi memori..."
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="text-sm bg-bg border-line"
            />
          </div>

          {/* Memorable Scene */}
          <div className="space-y-1.5">
            <label htmlFor="f-scene" className="!mt-0 text-xs font-medium text-text-subtle">
              Adegan yang Nempel
            </label>
            <input
              type="text"
              id="f-scene"
              placeholder="Sekuens visual, dialog, atau shot mana yang terus membekas?"
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              className="text-sm bg-bg border-line"
            />
          </div>

          {/* Content Angle */}
          <div className="space-y-1.5">
            <label htmlFor="f-angle" className="!mt-0 text-xs font-medium text-text-subtle">
              Angle Konten / Sudut Pandang
            </label>
            <input
              type="text"
              id="f-angle"
              placeholder="Pertanyaan utama, premis hook, atau argumen inti untuk video essay..."
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              className="text-sm bg-bg border-line"
            />
          </div>

          {/* Freeform Notes */}
          <div className="space-y-1.5">
            <label htmlFor="f-notes" className="!mt-0 text-xs font-medium text-text-subtle">
              Catatan Bebas & Corat-Coret
            </label>
            <textarea
              id="f-notes"
              placeholder="Tuliskan pemikiran mengalir, kutipan dialog, atau asosiasi dengan film lain..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm bg-bg border-line min-h-[140px] leading-relaxed"
            />
          </div>
        </section>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn primary w-full py-3 text-sm font-semibold shadow-md shadow-accent/20 cursor-pointer"
          >
            {submitting ? 'Menyimpan Catatan Riset...' : 'Simpan Catatan Riset'}
          </button>
        </div>
      </form>
    </div>
  );
}
