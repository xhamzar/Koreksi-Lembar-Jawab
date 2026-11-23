'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  Share,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppContext';
import { useOnlineStatus, usePWAInstall } from '@/hooks/usePWAInstall';
import { formatIndonesianNumber } from '@/lib/grading/engine';

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon =
            toast.type === 'success'
              ? CheckCircle2
              : toast.type === 'error'
                ? XCircle
                : toast.type === 'warning'
                  ? AlertTriangle
                  : Info;

          const accent =
            toast.type === 'success'
              ? 'text-emerald-600 dark:text-emerald-400'
              : toast.type === 'error'
                ? 'text-rose-600 dark:text-rose-400'
                : toast.type === 'warning'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-[#1273AA] dark:text-sky-400';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-lg backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${accent}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Tutup notifikasi"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function ConfirmModal() {
  const { confirmState, closeConfirm } = useApp();
  const [busy, setBusy] = useState(false);

  if (!confirmState) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await confirmState.onConfirm();
      closeConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.16 }}
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              confirmState.destructive
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                : 'bg-sky-50 text-[#1273AA] dark:bg-sky-950/50 dark:text-sky-400'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {confirmState.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {confirmState.description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={closeConfirm}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className={`min-h-[44px] rounded-xl px-4 text-sm font-semibold text-white transition disabled:opacity-60 ${
              confirmState.destructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#1273AA] hover:bg-[#0E5E8C]'
            }`}
          >
            {busy ? 'Memproses...' : confirmState.confirmLabel || 'Konfirmasi'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function PWAInstallButton({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${
          variant === 'dark'
            ? 'border border-sky-400/30 bg-sky-400/10 text-sky-200 hover:bg-sky-400/20'
            : 'border border-sky-200 bg-sky-50 text-[#0F5D8C] hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/60'
        }`}
      >
        <Download className="h-4 w-4 shrink-0" />
        Instal Aplikasi (PWA)
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold transition ${
            variant === 'dark'
              ? 'border border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-800'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          <Share className="h-4 w-4 shrink-0" />
          Instal di iPhone / iPad
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Instal Koreksi Lembar Jawab di iOS
              </h3>
              <ol className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li>1. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah Safari.</li>
                <li>2. Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama</strong>.</li>
                <li>3. Ketuk <strong>Tambah</strong> agar aplikasi siap dipakai offline.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 min-h-[44px] w-full rounded-xl bg-[#1273AA] text-sm font-semibold text-white hover:bg-[#0E5E8C]"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 shadow-md dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 md:bottom-4">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Mode Offline · Semua fitur tetap berjalan lokal</span>
    </div>
  );
}

export function ScoreRing({
  score,
  size = 54,
  strokeWidth = 4.5,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - clamped / 100);

  const strokeColor =
    clamped >= 75 ? '#16A34A' : clamped >= 55 ? '#D97706' : '#DC2626';

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={`Nilai ${formatIndonesianNumber(score)}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200/80 dark:text-slate-700/70"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.35s ease' }}
        />
      </svg>
      <span className="font-mono-num absolute text-sm font-bold text-slate-900 dark:text-slate-100">
        {formatIndonesianNumber(score)}
      </span>
    </div>
  );
}
