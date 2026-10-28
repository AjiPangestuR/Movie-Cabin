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
  triggerText = 'Hapus',
  className = '',
}: ConfirmInlineProps) {
  if (isConfirming) {
    return (
      <div className={`inline-flex items-center gap-2 flex-wrap ${className}`}>
        <span className="text-muted text-sm">{promptText}</span>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center justify-center gap-2 px-[18px] py-[11px] rounded-xl border border-line bg-surface text-danger font-medium hover:border-danger/50 focus-visible:outline-2 focus-visible:outline-accent"
        >
          {confirmText}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-2 px-[18px] py-[11px] rounded-xl border border-line bg-surface text-text font-medium hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-accent"
        >
          {cancelText}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onInitiate}
      className={`inline-flex items-center justify-center gap-2 px-[18px] py-[11px] rounded-xl border border-line bg-surface text-danger font-medium hover:border-danger/50 focus-visible:outline-2 focus-visible:outline-accent ${className}`}
    >
      {triggerText}
    </button>
  );
}
