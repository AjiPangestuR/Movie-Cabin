'use client';

import React, { useState } from 'react';
import { Mood } from '@/types';
import { createCustomMood, renameCustomMood, deleteCustomMood } from '@/lib/moods';

interface MoodManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  moods: Mood[];
  onMoodsChange: (updatedMoods: Mood[]) => void;
}

export function MoodManagerModal({
  isOpen,
  onClose,
  moods,
  onMoodsChange,
}: MoodManagerModalProps) {
  const [newMoodName, setNewMoodName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newMoodName.trim();
    if (!clean) return;

    if (clean.length > 24) {
      showError('Nama mood maksimal 24 karakter.');
      return;
    }

    setIsAdding(true);
    setErrorMessage(null);

    try {
      const created = await createCustomMood(clean);
      const updated = [...moods, created];
      onMoodsChange(updated);
      setNewMoodName('');
      showSuccess(`Mood "${created.name}" berhasil ditambahkan.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan mood baru.';
      showError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const startEditing = (mood: Mood) => {
    setEditingId(mood.id);
    setEditingName(mood.name);
    setDeletingId(null);
    setErrorMessage(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleRename = async (id: string) => {
    const clean = editingName.trim();
    if (!clean) {
      showError('Nama mood tidak boleh kosong.');
      return;
    }

    if (clean.length > 24) {
      showError('Nama mood maksimal 24 karakter.');
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const updatedMood = await renameCustomMood(id, clean);
      const updated = moods.map((m) => (m.id === id ? updatedMood : m));
      onMoodsChange(updated);
      setEditingId(null);
      setEditingName('');
      showSuccess(`Nama mood diubah menjadi "${updatedMood.name}".`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah nama mood.';
      showError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const startDeleting = (id: string) => {
    setDeletingId(id);
    setEditingId(null);
    setErrorMessage(null);
  };

  const cancelDeleting = () => {
    setDeletingId(null);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteCustomMood(id);
      const updated = moods.filter((m) => m.id !== id);
      onMoodsChange(updated);
      setDeletingId(null);
      showSuccess('Mood berhasil dihapus.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus mood.';
      showError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mood-mgr-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-surface border border-line rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-line/60 flex-none">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <h2 id="mood-mgr-title" className="font-serif font-bold text-lg text-text">
                Pengelolaan Mood
              </h2>
            </div>
            <p className="text-muted text-xs font-mono mt-0.5">
              Total {moods.length} mood tersimpan di arsip akun lu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Tutup dialog pengelolaan mood"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div
            role="alert"
            className="m-4 mb-0 p-3 rounded-lg border border-danger/30 bg-danger/10 text-xs text-danger flex items-start gap-2.5"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current flex-none mt-0.5" aria-hidden="true">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4.5zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
            </svg>
            <span className="flex-1 leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="m-4 mb-0 p-3 rounded-lg border border-ok/30 bg-ok/10 text-xs text-ok flex items-center gap-2.5"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current flex-none" aria-hidden="true">
              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
            </svg>
            <span className="flex-1">{successMessage}</span>
          </div>
        )}

        {/* Add Mood Form */}
        <form onSubmit={handleAdd} className="p-4 sm:p-5 border-b border-line/60 flex-none bg-surface-elevated/40">
          <label htmlFor="new-mood-input" className="!mt-0 text-[11px] font-mono uppercase tracking-wider text-muted block mb-1.5">
            Tambah Mood Baru
          </label>
          <div className="flex gap-2">
            <input
              id="new-mood-input"
              type="text"
              placeholder="Ketik nama mood (1-24 karakter)..."
              value={newMoodName}
              onChange={(e) => setNewMoodName(e.target.value)}
              maxLength={24}
              disabled={isAdding}
              className="flex-1 bg-bg border border-line rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:border-accent transition-all"
            />
            <button
              type="submit"
              disabled={isAdding || !newMoodName.trim()}
              className="btn primary text-xs py-2 px-3.5 flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {isAdding ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#121017] border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                    <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z" />
                  </svg>
                  <span>Tambah</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Mood List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-2 flex items-center justify-between">
            <span>Daftar Mood Aktif</span>
            <span>Aksi</span>
          </div>

          {moods.length === 0 ? (
            <div className="text-center py-8 text-muted text-xs font-mono">
              Belum ada mood tersimpan. Tambahkan mood pertama di atas.
            </div>
          ) : (
            moods.map((mood) => {
              const isEditing = editingId === mood.id;
              const isConfirmingDelete = deletingId === mood.id;

              return (
                <div
                  key={mood.id}
                  className="p-2.5 rounded-lg border border-line-subtle bg-surface-elevated/60 flex items-center justify-between gap-3 transition-colors hover:border-line"
                >
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        maxLength={24}
                        autoFocus
                        aria-label={`Ubah nama mood ${mood.name}`}
                        className="flex-1 bg-bg border border-accent rounded px-2.5 py-1 text-sm text-text"
                      />
                      <button
                        type="button"
                        onClick={() => handleRename(mood.id)}
                        disabled={isUpdating || !editingName.trim()}
                        className="btn text-xs py-1 px-2.5 bg-accent text-[#121017] hover:bg-accent/90 cursor-pointer disabled:opacity-50"
                        title="Simpan perubahan nama"
                      >
                        {isUpdating ? '...' : 'Simpan'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={isUpdating}
                        className="btn text-xs py-1 px-2 bg-surface text-muted hover:text-text cursor-pointer"
                        title="Batal edit"
                      >
                        Batal
                      </button>
                    </div>
                  ) : isConfirmingDelete ? (
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-danger font-medium truncate">
                        Hapus mood &quot;{mood.name}&quot;?
                      </span>
                      <div className="flex items-center gap-1.5 flex-none">
                        <button
                          type="button"
                          onClick={() => handleDelete(mood.id)}
                          disabled={isDeleting}
                          className="btn text-xs py-1 px-2.5 bg-danger text-white hover:bg-danger/90 cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelDeleting}
                          disabled={isDeleting}
                          className="btn text-xs py-1 px-2 bg-surface text-muted hover:text-text cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text truncate">
                          {mood.name}
                        </div>
                        <div className="text-[11px] font-mono text-muted/70 truncate">
                          slug: {mood.slug}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-none">
                        {/* Tombol Ubah Nama */}
                        <button
                          type="button"
                          onClick={() => startEditing(mood)}
                          className="w-7 h-7 rounded flex items-center justify-center text-muted hover:text-accent hover:bg-surface transition-colors cursor-pointer"
                          title={`Ubah nama mood ${mood.name}`}
                          aria-label={`Ubah nama mood ${mood.name}`}
                        >
                          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.806 2.016 2.016-.806-1.21-1.21z" />
                          </svg>
                        </button>

                        {/* Tombol Hapus */}
                        <button
                          type="button"
                          onClick={() => startDeleting(mood.id)}
                          className="w-7 h-7 rounded flex items-center justify-center text-muted hover:text-danger hover:bg-surface transition-colors cursor-pointer"
                          title={`Hapus mood ${mood.name}`}
                          aria-label={`Hapus mood ${mood.name}`}
                        >
                          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-line/60 flex items-center justify-between flex-none bg-surface-elevated/20 text-xs">
          <span className="text-muted text-[11px] font-mono">
            Semua perubahan mood disinkronkan ke form.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn text-xs py-1.5 px-4 bg-surface text-text hover:bg-surface-elevated border border-line cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
