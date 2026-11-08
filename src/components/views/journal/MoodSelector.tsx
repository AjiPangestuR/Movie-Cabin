'use client';

import React from 'react';
import { JOURNAL_MOODS, type JournalMood } from '@/types';

interface MoodSelectorProps {
  selectedMood: JournalMood | null;
  onSelectMood: (mood: JournalMood | null) => void;
  className?: string;
  allowClear?: boolean;
}

const MOOD_COLORS: Record<JournalMood, { active: string; idle: string }> = {
  Melankolis: {
    active: 'bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-sky-500/20',
    idle: 'bg-surface/60 text-muted border-line hover:text-sky-300 hover:border-sky-500/30',
  },
  Kontemplatif: {
    active: 'bg-primary/20 text-primary-bright border-primary/50 shadow-primary/20',
    idle: 'bg-surface/60 text-muted border-line hover:text-primary-bright hover:border-primary/30',
  },
  Nostalgia: {
    active: 'bg-amber/20 text-amber border-amber/50 shadow-amber/20',
    idle: 'bg-surface/60 text-muted border-line hover:text-amber hover:border-amber/30',
  },
  Tenang: {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-emerald-500/20',
    idle: 'bg-surface/60 text-muted border-line hover:text-emerald-300 hover:border-emerald-500/30',
  },
  Resah: {
    active: 'bg-rose-500/20 text-rose-300 border-rose-400/50 shadow-rose-500/20',
    idle: 'bg-surface/60 text-muted border-line hover:text-rose-300 hover:border-rose-500/30',
  },
  Hangat: {
    active: 'bg-orange-500/20 text-orange-300 border-orange-400/50 shadow-orange-500/20',
    idle: 'bg-surface/60 text-muted border-line hover:text-orange-300 hover:border-orange-500/30',
  },
  Puitis: {
    active: 'bg-neon-magenta/20 text-neon-magenta border-neon-magenta/50 shadow-neon-magenta/20',
    idle: 'bg-surface/60 text-muted border-line hover:text-neon-magenta hover:border-neon-magenta/30',
  },
  Soliter: {
    active: 'bg-lavender/20 text-lavender border-lavender/50 shadow-lavender/20',
    idle: 'bg-surface/60 text-muted border-line hover:text-lavender hover:border-lavender/30',
  },
};

export function MoodSelector({
  selectedMood,
  onSelectMood,
  className = '',
  allowClear = true,
}: MoodSelectorProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {allowClear && (
        <button
          type="button"
          onClick={() => onSelectMood(null)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer ${
            selectedMood === null
              ? 'bg-surface-elevated text-text border-primary/40 font-semibold shadow-xs'
              : 'bg-surface/60 text-muted border-line hover:text-text hover:border-line-subtle'
          }`}
        >
          Semua Mood
        </button>
      )}

      {JOURNAL_MOODS.map((mood) => {
        const isSelected = selectedMood === mood;
        const colorStyle = MOOD_COLORS[mood];

        return (
          <button
            key={mood}
            type="button"
            onClick={() => onSelectMood(isSelected && allowClear ? null : mood)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
              isSelected
                ? `${colorStyle.active} font-semibold shadow-xs scale-[1.02]`
                : colorStyle.idle
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-transform ${
                isSelected ? 'scale-125 bg-current animate-pulse' : 'bg-muted/40'
              }`}
              aria-hidden="true"
            />
            <span>{mood}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Helper untuk merender mood badge individual secara ringkas
 */
export function MoodBadge({
  mood,
  size = 'sm',
  className = '',
}: {
  mood: JournalMood | null | undefined;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  if (!mood) return null;

  const colorStyle = MOOD_COLORS[mood] || {
    active: 'bg-primary/20 text-primary-bright border-primary/40',
    idle: '',
  };

  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'md'
      ? 'px-3.5 py-1.5 text-xs'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium ${sizeClasses} ${colorStyle.active} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {mood}
    </span>
  );
}
