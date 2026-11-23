'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Scan,
  Search,
  Trophy,
  User,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppContext';
import {
  computeExamAnalytics,
  formatIndonesianNumber,
  getActiveLetters,
} from '@/lib/grading/engine';
import { exportResultsToExcel, exportResultsToPdf } from '@/lib/export/exporters';
import { ScoreRing } from '@/components/ui/AppOverlays';
import { StudentDetailView } from '@/components/results/StudentDetailView';

type ResultsSubTab = 'peringkat' | 'analisis' | 'detail';

export function ResultsView() {
  const {
    settings,
    exams,
    activeExam,
    setActiveExamId,
    activeExamResults,
    selectedResultId,
    setSelectedResultId,
    setActiveTab,
    pushToast,
  } = useApp();

  const [subTab, setSubTab] = useState<ResultsSubTab>('peringkat');
  const [searchQuery, setSearchQuery] = useState('');

  const analytics = useMemo(
    () => computeExamAnalytics(activeExam, activeExamResults),
    [activeExam, activeExamResults]
  );

  const selectedResult = useMemo(
    () => activeExamResults.find((r) => r.id === selectedResultId) || null,
    [activeExamResults, selectedResultId]
  );

  const filteredRankings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return analytics.rankings;
    return analytics.rankings.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.participantNumber.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q)
    );
  }, [analytics.rankings, searchQuery]);

  if (!activeExam) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-[#131D2E]">
        <p className="text-base font-bold text-slate-900 dark:text-white">
          Belum ada ujian aktif
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Buat ujian terlebih dahulu di menu Pengaturan untuk mulai melihat hasil.
        </p>
      </div>
    );
  }

  if (selectedResult) {
    return (
      <StudentDetailView
        exam={activeExam}
        result={selectedResult}
        onBack={() => setSelectedResultId(null)}
      />
    );
  }

  const activeLetters = getActiveLetters(activeExam.optionCount);

  return (
    <div className="space-y-5">
      {/* Header & Export Actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-balance text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Hasil
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            {exams.length > 1 ? (
              <select
                value={activeExam.id}
                onChange={(e) => setActiveExamId(e.target.value)}
                aria-label="Pilih ujian untuk melihat hasil"
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.examType} · {ex.subject} · {ex.className}
                  </option>
                ))}
              </select>
            ) : (
              <span>
                {activeExam.examType} · {activeExam.subject} · {activeExam.className}
              </span>
            )}
          </div>
        </div>

        {analytics.studentCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                exportResultsToExcel(activeExam, settings, analytics);
                pushToast({ type: 'success', title: 'Laporan Excel (.xlsx) berhasil diunduh' });
              }}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl bg-emerald-50 px-3.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button
              type="button"
              onClick={() => {
                exportResultsToPdf(activeExam, settings, analytics);
                pushToast({ type: 'success', title: 'Laporan PDF berhasil diunduh' });
              }}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl bg-rose-50 px-3.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        )}
      </div>

      {/* 4 Pastel KPI Summary Cards (exact visual match to reference screenshot!) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-3xl bg-[#E8F4FD] p-4 dark:bg-sky-950/45 sm:p-5">
          <p className="text-xs font-bold text-[#1273AA] dark:text-sky-300">siswa</p>
          <p className="font-mono-num mt-1.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {analytics.studentCount}
          </p>
        </div>
        <div className="rounded-3xl bg-[#FEF6DB] p-4 dark:bg-amber-950/45 sm:p-5">
          <p className="text-xs font-bold text-[#B87D0B] dark:text-amber-300">rata-rata</p>
          <p className="font-mono-num mt-1.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {analytics.studentCount > 0
              ? formatIndonesianNumber(analytics.averageScore)
              : '—'}
          </p>
        </div>
        <div className="rounded-3xl bg-[#E7F7EE] p-4 dark:bg-emerald-950/45 sm:p-5">
          <p className="text-xs font-bold text-[#15803D] dark:text-emerald-300">tertinggi</p>
          <p className="font-mono-num mt-1.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {analytics.studentCount > 0
              ? formatIndonesianNumber(analytics.highestScore)
              : '—'}
          </p>
        </div>
        <div className="rounded-3xl bg-[#FCECEB] p-4 dark:bg-rose-950/45 sm:p-5">
          <p className="text-xs font-bold text-[#C83232] dark:text-rose-300">terendah</p>
          <p className="font-mono-num mt-1.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {analytics.studentCount > 0
              ? formatIndonesianNumber(analytics.lowestScore)
              : '—'}
          </p>
        </div>
      </div>

      {/* 3 Sub-Tabs matching reference screenshot */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {(
          [
            { id: 'peringkat', label: 'Peringkat', icon: Trophy },
            { id: 'analisis', label: 'Analisis soal', icon: BarChart3 },
            { id: 'detail', label: 'Detail siswa', icon: User },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-xs font-bold transition active:scale-[0.98] sm:flex-row sm:gap-2 sm:text-sm ${
                active
                  ? 'bg-[#1273AA] text-white shadow-md shadow-[#1273AA]/20'
                  : 'border border-slate-200/70 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#131D2E] dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {analytics.studentCount === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-[#131D2E]">
          <p className="text-base font-bold text-slate-900 dark:text-white">
            Belum ada hasil koreksi untuk ujian ini
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Mulai pindai lembar jawaban siswa untuk melihat peringkat dan analisis butir soal.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-[#1273AA] px-6 text-sm font-bold text-white hover:bg-[#0E5E8C]"
          >
            <Scan className="h-4 w-4" />
            Pindai LJK Sekarang
          </button>
        </div>
      ) : subTab === 'peringkat' ? (
        <div className="space-y-3">
          {/* Quick Search when > 3 students */}
          {analytics.studentCount > 3 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa atau nomor peserta..."
                className="min-h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-[#1273AA] dark:border-slate-800 dark:bg-[#131D2E] dark:text-white"
              />
            </div>
          )}

          {filteredRankings.map((student) => {
            const rankBadgeStyle =
              student.rank === 1
                ? 'bg-[#E5B84B] text-white'
                : student.rank === 2
                  ? 'bg-[#F5E6BE] text-[#9A6B11] dark:bg-amber-900/60 dark:text-amber-200'
                  : student.rank === 3
                    ? 'bg-[#F7ECD1] text-[#8F6522] dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

            return (
              <button
                key={student.id}
                type="button"
                onClick={() => setSelectedResultId(student.id)}
                className="flex w-full items-center justify-between gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 text-left shadow-xs transition hover:border-[#1273AA]/40 hover:shadow-sm active:scale-[0.99] dark:border-slate-800 dark:bg-[#131D2E] sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span
                    className={`font-mono-num flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${rankBadgeStyle}`}
                  >
                    {student.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-900 dark:text-white">
                      {student.studentName}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {student.correctCount} benar · {student.wrongCount} salah ·{' '}
                      {student.emptyCount} kosong
                    </p>
                  </div>
                </div>

                <ScoreRing score={student.score} size={54} />
              </button>
            );
          })}

          <p className="pt-1 text-center text-xs text-slate-500 dark:text-slate-400">
            Ketuk nama untuk membuka detail siswa.
          </p>
        </div>
      ) : subTab === 'analisis' ? (
        <div className="space-y-4">
          {/* Hardest Questions Highlight */}
          {analytics.hardestQuestions.length > 0 && (
            <div className="rounded-3xl border border-amber-200/80 bg-[#FFFBF0] p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <h2 className="text-sm font-bold">Soal Paling Sulit (Persentase Benar Terendah)</h2>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {analytics.hardestQuestions.map((hq) => (
                  <div
                    key={hq.questionNumber}
                    className="rounded-2xl border border-amber-200/70 bg-white p-3 dark:border-amber-800/50 dark:bg-slate-900"
                  >
                    <p className="font-mono-num text-xs font-bold text-slate-500 dark:text-slate-400">
                      Soal #{hq.questionNumber} · Kunci {hq.correctAnswer || '-'}
                    </p>
                    <p className="font-mono-num mt-1 text-lg font-extrabold text-rose-600 dark:text-rose-400">
                      {formatIndonesianNumber(hq.correctPercent)}%
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {hq.correctCount} benar · {hq.wrongCount} salah
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Item Analysis List */}
          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] sm:p-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Distribusi Jawaban per Nomor Soal ({activeExam.questionCount} soal)
            </h2>
            <div className="mt-4 space-y-2.5">
              {analytics.itemAnalysis.map((item) => {
                const diffColor =
                  item.difficulty === 'Mudah'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : item.difficulty === 'Sedang'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400';

                return (
                  <div
                    key={item.questionNumber}
                    className="rounded-2xl border border-slate-100 bg-[#F9FBFD] p-3.5 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="font-mono-num flex h-7 w-7 items-center justify-center rounded-lg bg-[#E9F3FA] text-[#1273AA] dark:bg-sky-950 dark:text-sky-300">
                          {item.questionNumber}
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          Kunci: {item.correctAnswer || '-'}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className={diffColor}>{item.difficulty}</span>
                      </div>

                      <div className="font-mono-num text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {item.correctCount} benar · {item.wrongCount} salah · {item.emptyCount} kosong (
                        {formatIndonesianNumber(item.correctPercent)}%)
                      </div>
                    </div>

                    {/* Option Distribution Bars */}
                    <div className="mt-2.5 grid grid-cols-5 gap-2">
                      {activeLetters.map((ltr) => {
                        const cnt = item.distribution[ltr] || 0;
                        const pct =
                          analytics.studentCount > 0
                            ? Math.round((cnt / analytics.studentCount) * 100)
                            : 0;
                        const isKey = item.correctAnswer === ltr;
                        return (
                          <div key={ltr} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span
                                className={
                                  isKey
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                }
                              >
                                {ltr}
                              </span>
                              <span className="font-mono-num text-slate-700 dark:text-slate-300">
                                {cnt}
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                              <div
                                className={`h-full rounded-full ${
                                  isKey ? 'bg-emerald-500' : 'bg-[#1273AA]/65'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Detail Siswa Directory Tab */
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa untuk melihat rincian lembar jawaban..."
              className="min-h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-[#1273AA] dark:border-slate-800 dark:bg-[#131D2E] dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredRankings.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => setSelectedResultId(student.id)}
                className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 text-left shadow-xs transition hover:border-[#1273AA]/50 dark:border-slate-800 dark:bg-[#131D2E]"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900 dark:text-white">
                    {student.studentName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {student.className || activeExam.className} · No.{' '}
                    {student.participantNumber || '-'}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ketepatan {formatIndonesianNumber(student.accuracyPercent)}% ·{' '}
                    {student.correctCount}/{student.totalQuestions} benar
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <ScoreRing score={student.score} size={50} />
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
