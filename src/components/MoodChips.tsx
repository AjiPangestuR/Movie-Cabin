import React from 'react';

interface MoodChipsProps {
  moods?: string[];
  selectedMoods: string[] | Set<string>;
  onToggle: (mood: string) => void;
  wrap?: boolean;
  className?: string;
}

export function MoodChips({
  moods = [],
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
      role="group"
      aria-label="Filter berdasarkan mood"
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
            className={`flex-none px-3.5 py-1.5 rounded-full border text-xs sm:text-[13px] transition-all duration-150 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-accent ${
              active
                ? 'bg-accent/15 border-accent text-text font-medium shadow-xs shadow-accent/20'
                : 'bg-surface/60 border-line text-muted hover:border-line-subtle hover:text-text hover:bg-surface-elevated'
            }`}
          >
            {mood}
          </button>
        );
      })}
    </div>
  );
}
