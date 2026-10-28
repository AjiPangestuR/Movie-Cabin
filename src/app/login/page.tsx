'use client';

import React, { useActionState } from 'react';
import { loginAction, LoginState } from '@/app/auth/actions';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState | null, FormData>(
    loginAction,
    null
  );

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4">
      <div className="w-full max-w-sm sm:max-w-md space-y-6">
        {/* Brand Masthead */}
        <div className="text-center space-y-2">
          <div className="inline-block">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted/70 block mb-1">
              Private Film Archive
            </span>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-text tracking-tight">
              MOCAB
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            Movie Cabin <span className="text-line">·</span> by Beruang Sastra
          </p>
        </div>

        {/* Login Card */}
        <div className="panel bg-surface/80 border border-line p-6 sm:p-8 shadow-xl shadow-black/40 rounded-xl space-y-5">
          <div className="border-b border-line/60 pb-3">
            <h2 className="text-xl font-serif font-semibold text-text">
              Masuk ke Kabin
            </h2>
            <p className="text-muted text-xs mt-0.5">
              Autentikasi untuk membuka arsip dan catatan riset pribadi.
            </p>
          </div>

          {state?.error && (
            <div
              role="alert"
              className="border border-danger/40 bg-danger/10 rounded-lg p-3 text-danger text-xs sm:text-sm flex items-center gap-2"
            >
              <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current flex-none" aria-hidden="true">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM7 4h2v5H7V4zm0 6h2v2H7v-2z" />
              </svg>
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="!mt-0 block text-xs font-medium text-text-subtle">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                required
                placeholder="nama@domain.com"
                className="w-full bg-bg border border-line rounded-lg px-3.5 py-2.5 text-sm text-text focus:border-accent focus:bg-surface-elevated transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="!mt-0 block text-xs font-medium text-text-subtle">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full bg-bg border border-line rounded-lg px-3.5 py-2.5 text-sm text-text focus:border-accent focus:bg-surface-elevated transition-all"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="btn primary w-full py-2.5 text-sm font-semibold shadow-sm shadow-accent/20 cursor-pointer"
              >
                {isPending ? 'Memverifikasi Akun...' : 'Masuk ke Kabin'}
              </button>
            </div>
          </form>
        </div>

        {/* Private Collection Notice */}
        <p className="text-center text-muted/70 text-xs max-w-xs mx-auto leading-relaxed">
          Koleksi bersifat privat. Pendaftaran akun baru dikelola langsung melalui database administrator.
        </p>
      </div>
    </div>
  );
}
