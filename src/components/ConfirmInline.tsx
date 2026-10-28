import React from 'react';

interface ConfirmInlineProps {
  isConfirming: boolean;
  onInitiate: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  promptText?: string;
  confirmText?: string;
  cancelText?: string;
  triggerText?: string;
  className?: string;
}

export function ConfirmInline({
  isConfirming,
  onInitiate,
  onConfirm,
  onCancel,
  promptText = 'Hapus film dan catatannya?',
  confirmText = 'Ya, hapus',
  cancelText = 'Batal',
  triggerText = 'Hapus film',
  className = '',
}: ConfirmInlineProps) {
  if (isConfirming) {
    return (
      <div className={`inline-flex items-center gap-2.5 flex-wrap p-2 rounded-lg bg-surface border border-danger/30 ${className}`}>
        <span className="text-muted text-xs sm:text-sm pl-1">{promptText}</span>
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-md border border-danger/40 bg-danger/10 text-danger text-xs font-medium hover:bg-danger/20 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-danger"
          >
            {confirmText}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md border border-line bg-surface text-text-subtle text-xs font-medium hover:text-text hover:bg-surface-elevated transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
          >
            {cancelText}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onInitiate}
      className={`px-3.5 py-2 rounded-lg border border-line/80 bg-surface/60 text-danger text-xs sm:text-sm font-medium hover:bg-danger/10 hover:border-danger/30 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-danger ${className}`}
    >
      {triggerText}
    </button>
  );
}
