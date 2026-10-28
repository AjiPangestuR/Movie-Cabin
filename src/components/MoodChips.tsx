import React from 'react';
import { MOODS } from '@/lib/mock-data';

interface MoodChipsProps {
  moods?: string[];
  selectedMoods: string[] | Set<string>;
  onToggle: (mood: string) => void;
  wrap?: boolean;
  className?: string;
}

export function MoodChips({
  moods = MOODS,
  selectedMoods,
  onToggle,
  wrap = false,
  className = '',
}: MoodChipsProps) {
  const isSelected = (mood: string) => {
    if (selectedMoods instanceof Set) {
      return selectedMoods.has(mood);
    }
    return selectedMoods.includes(mood);
  };

  return (
    <div
      className={`flex gap-2 py-1 px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        wrap ? 'flex-wrap' : 'overflow-x-auto'
      } ${className}`}
    >
      {moods.map((mood) => {
        const active = isSelected(mood);
        return (
          <button
            key={mood}
            type="button"
            onClick={() => onToggle(mood)}
            aria-pressed={active}
            className={`flex-none px-3.5 py-[7px] rounded-full border text-sm transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-accent ${
              active
                ? 'bg-accent-soft border-accent text-text font-medium'
                : 'bg-transparent border-line text-muted hover:border-accent/40'
            }`}
          >
            {mood}
          </button>
        );
      })}
    </div>
  );
}
