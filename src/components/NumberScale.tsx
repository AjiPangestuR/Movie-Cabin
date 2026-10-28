import React from 'react';

interface NumberScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  ariaLabelPrefix?: string;
  className?: string;
}

export function NumberScale({
  value,
  onChange,
  min = 1,
  max = 10,
  ariaLabelPrefix = 'Skala',
  className = '',
}: NumberScaleProps) {
  const count = max - min + 1;
  const numbers = Array.from({ length: count }, (_, i) => min + i);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabelPrefix}
      className={`grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-1.5 ${className}`}
    >
      {numbers.map((num) => {
        const isSelected = value === num;
        return (
          <button
            key={num}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(num)}
            aria-label={`${ariaLabelPrefix} ${num}`}
            className={`flex items-center justify-center py-2.5 sm:py-3 px-0 rounded-lg border text-sm font-medium transition-all duration-150 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-accent ${
              isSelected
                ? 'bg-accent border-accent text-[#121017] font-bold shadow-md shadow-accent/20 scale-[1.03]'
                : 'border-line bg-surface/60 text-muted hover:border-line-subtle hover:text-text hover:bg-surface-elevated'
            }`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}
