'use client';

import React, { useActionState } from 'react';
import { loginAction, LoginState } from '@/app/auth/actions';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState | null, FormData>(
    loginAction,
    null
  );

  return (
    <div className="max-w-md mx-auto pt-14 pb-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif font-bold text-text">MOCAB</h1>
        <p className="text-muted text-sm mt-1">Movie Cabin by Beruang Sastra</p>
      </div>

      <div className="panel">
        <h2 className="text-xl font-serif font-bold mb-1">Masuk</h2>
        <p className="text-muted text-xs mb-4">
          Ruang arsip film dan catatan riset pribadi.
        </p>

        {state?.error && (
          <div
            role="alert"
            className="border border-danger/40 bg-surface rounded-xl p-3 text-danger text-sm mb-4 text-center"
          >
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="!mt-0 block text-sm font-medium mb-1.5">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              required
              placeholder="nama@domain.com"
              className="w-full bg-surface border border-line rounded-xl px-3.5 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="!mt-0 block text-sm font-medium mb-1.5">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full bg-surface border border-line rounded-xl px-3.5 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn primary w-full mt-2"
          >
            {isPending ? 'Memproses...' : 'Masuk ke Kabin'}
          </button>
        </form>
      </div>

      <p className="text-center text-muted text-xs mt-6">
        Koleksi privat — pendaftaran akun hanya melalui administrator database.
      </p>
    </div>
  );
}
