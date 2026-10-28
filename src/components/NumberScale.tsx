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
    <div className={`grid grid-cols-5 gap-2 ${className}`}>
      {numbers.map((num) => {
        const isSelected = value === num;
        return (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            aria-label={`${ariaLabelPrefix} ${num}`}
            aria-pressed={isSelected}
            className={`text-center py-[11px] px-0 rounded-[10px] border text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent cursor-pointer ${
              isSelected
                ? 'bg-accent border-accent text-[#15111F] font-bold'
                : 'border-line text-muted hover:border-accent/40 bg-transparent'
            }`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}
