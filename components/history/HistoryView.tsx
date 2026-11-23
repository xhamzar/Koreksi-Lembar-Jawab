'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  Camera,
  ChevronRight,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  Filter,
  Image as ImageIcon,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppContext';
import { ScoreRing } from '@/components/ui/AppOverlays';
import { parseStudentsFromSpreadsheet } from '@/lib/export/exporters';

type HistorySubTab = 'sesi' | 'siswa' | 'aktivitas';

export function HistoryView() {
  const {
    exams,
    activeExam,
    results,
    sessions,
    activities,
    setActiveExamId,
    setActiveTab,
    setSelectedResultId,
    removeScanSession,
    clearHistory,
    downloadBackupJson,
    importBackupJson,
    importStudentsBatch,
    pushToast,
    requestConfirm,
  } = useApp();

  const [subTab, setSubTab] = useState<HistorySubTab>('sesi');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExamId, setFilterExamId] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');

  const backupInputRef = useRef<HTMLInputElement>(null);
  const rosterInputRef = useRef<HTMLInputElement>(null);

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => e.className && set.add(e.className));
    results.forEach((r) => r.className && set.add(r.className));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [exams, results]);

  const examMap = useMemo(() => new Map(exams.map((e) => [e.id, e])), [exams]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      if (filterExamId !== 'all' && s.examId !== filterExamId) return false;
      if (filterClass !== 'all' && s.className !== filterClass) return false;
      if (q && !s.examLabel.toLowerCase().includes(q) && !s.className.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [filterClass, filterExamId, searchQuery, sessions]);

  const filteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return results.filter((r) => {
      if (filterExamId !== 'all' && r.examId !== filterExamId) return false;
      if (filterClass !== 'all' && r.className !== filterClass) return false;
      if (
        q &&
        !r.studentName.toLowerCase().includes(q) &&
        !r.participantNumber.toLowerCase().includes(q) &&
        !r.className.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [filterClass, filterExamId, results, searchQuery]);

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    requestConfirm({
      title: 'Pulihkan database dari cadangan?',
      description:
        'Seluruh data ujian, siswa, dan hasil saat ini akan diganti dengan isi berkas cadangan JSON ini.',
      confirmLabel: 'Ya, Pulihkan',
      onConfirm: async () => {
        try {
          await importBackupJson(file);
        } catch (err) {
          pushToast({
            type: 'error',
            title: 'Gagal memulihkan database',
            description: err instanceof Error ? err.message : 'Format berkas tidak valid.',
          });
        }
      },
    });
  };

  const handleImportRoster = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = await parseStudentsFromSpreadsheet(
        file,
        activeExam?.className || 'Kelas X'
      );
      await importStudentsBatch(parsed);
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Gagal mengimpor data siswa',
        description: err instanceof Error ? err.message : 'Pastikan format CSV/Excel valid.',
      });
    }
  };

  const handleOpenResult = async (examId: string, resultId: string) => {
    await setActiveExamId(examId);
    setActiveTab('results');
    setSelectedResultId(resultId);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-balance text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Riwayat & Data Lokal
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Seluruh data tersimpan aman di perangkat (IndexedDB) dan tetap tersedia saat offline.
          </p>
        </div>

        {(sessions.length > 0 || activities.length > 0) && (
          <button
            type="button"
            onClick={() =>
              requestConfirm({
                title: 'Bersihkan riwayat pemindaian & aktivitas?',
                description:
                  'Catatan riwayat sesi dan log aktivitas akan dihapus. Nilai siswa dan data ujian tetap aman.',
                confirmLabel: 'Hapus Riwayat',
                destructive: true,
                onConfirm: clearHistory,
              })
            }
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
            Hapus Riwayat
          </button>
        )}
      </div>

      {/* Backup, Restore & Import Data Bar */}
      <section className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] sm:p-5">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[#1273AA] dark:text-sky-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Manajemen Database Lokal
          </h2>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <button
            type="button"
            onClick={downloadBackupJson}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#1273AA] px-4 text-xs font-bold text-white transition hover:bg-[#0E5E8C]"
          >
            <Download className="h-4 w-4" />
            Backup Database (JSON)
          </button>

          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleRestoreFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => backupInputRef.current?.click()}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#E9F3FA] px-4 text-xs font-bold text-[#1273AA] transition hover:bg-[#D9ECF8] dark:bg-sky-950/60 dark:text-sky-300"
          >
            <Upload className="h-4 w-4" />
            Restore Database
          </button>

          <input
            ref={rosterInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportRoster}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => rosterInputRef.current?.click()}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Impor Siswa (Excel/CSV)
          </button>
        </div>
      </section>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
        <div className="relative sm:col-span-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa, kelas, atau ujian..."
            className="min-h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-[#1273AA] dark:border-slate-800 dark:bg-[#131D2E] dark:text-white"
          />
        </div>

        <div className="relative sm:col-span-3">
          <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <select
            value={filterExamId}
            onChange={(e) => setFilterExamId(e.target.value)}
            aria-label="Filter berdasarkan ujian"
            className="min-h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:border-[#1273AA] dark:border-slate-800 dark:bg-[#131D2E] dark:text-slate-200"
          >
            <option value="all">Semua Ujian</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.examType} · {ex.subject}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            aria-label="Filter berdasarkan kelas"
            className="min-h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 text-xs font-bold text-slate-700 outline-none focus:border-[#1273AA] dark:border-slate-800 dark:bg-[#131D2E] dark:text-slate-200"
          >
            <option value="all">Semua Kelas</option>
            {uniqueClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="grid grid-cols-3 gap-2.5">
        {(
          [
            { id: 'sesi', label: `Sesi Pindai (${filteredSessions.length})`, icon: Clock },
            { id: 'siswa', label: `Hasil Siswa (${filteredResults.length})`, icon: Search },
            { id: 'aktivitas', label: `Aktivitas (${activities.length})`, icon: Activity },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl px-2 text-xs font-bold transition ${
                active
                  ? 'bg-[#1273AA] text-white shadow-sm'
                  : 'border border-slate-200/70 bg-white text-slate-600 dark:border-slate-800 dark:bg-[#131D2E] dark:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SCAN SESSIONS */}
      {subTab === 'sesi' &&
        (filteredSessions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-[#131D2E]">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Belum ada riwayat sesi pemindaian
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Setiap pemindaian 1–3 lembar LJK yang disimpan akan tercatat otomatis di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((sess) => (
              <div
                key={sess.id}
                className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#131D2E]"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  {sess.thumbnailDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={sess.thumbnailDataUrl}
                      alt="Pratinjau LJK"
                      referrerPolicy="no-referrer"
                      className="h-14 w-11 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E9F3FA] text-[#1273AA] dark:bg-sky-950/60 dark:text-sky-300">
                      {sess.source === 'camera' ? (
                        <Camera className="h-5 w-5" />
                      ) : (
                        <ImageIcon className="h-5 w-5" />
                      )}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {sess.examLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {sess.className} · {sess.sheetCount} lembar ·{' '}
                      {sess.source === 'camera' ? 'Kamera' : 'Galeri'} · {sess.processingMs} ms
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {new Date(sess.createdAt).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    requestConfirm({
                      title: 'Hapus catatan sesi ini?',
                      description: 'Catatan riwayat akan dihapus tanpa menghapus nilai siswa.',
                      confirmLabel: 'Hapus',
                      destructive: true,
                      onConfirm: () => removeScanSession(sess.id),
                    })
                  }
                  aria-label="Hapus riwayat sesi"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ))}

      {/* TAB 2: ALL FILTERED STUDENT RESULTS */}
      {subTab === 'siswa' &&
        (filteredResults.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-[#131D2E]">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Tidak ada hasil siswa yang cocok dengan filter
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredResults.map((res) => {
              const ex = examMap.get(res.examId);
              return (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => handleOpenResult(res.examId, res.id)}
                  className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 text-left shadow-xs transition hover:border-[#1273AA]/40 dark:border-slate-800 dark:bg-[#131D2E]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {res.studentName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {ex ? `${ex.examType} · ${ex.subject}` : 'Ujian'} · {res.className}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {res.correctCount} benar · {res.wrongCount} salah · {res.emptyCount} kosong
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScoreRing score={res.score} size={48} />
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        ))}

      {/* TAB 3: ACTIVITY LOG */}
      {subTab === 'aktivitas' &&
        (activities.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-[#131D2E]">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Belum ada aktivitas tercatat
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] sm:p-5">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {activities.map((act) => (
                <li key={act.id} className="flex items-start justify-between gap-3 py-3 first:pt-1 last:pb-1">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{act.action}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{act.detail}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">
                    {new Date(act.createdAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
