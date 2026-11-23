'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  MinusCircle,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { AnswerLetter, AnswerValue, Exam, GradingResult } from '@/lib/types';
import { formatIndonesianNumber, getActiveLetters } from '@/lib/grading/engine';
import { ScoreRing } from '@/components/ui/AppOverlays';
import { useApp } from '@/components/providers/AppContext';

interface StudentDetailViewProps {
  exam: Exam;
  result: GradingResult;
  onBack: () => void;
}

export function StudentDetailView({ exam, result, onBack }: StudentDetailViewProps) {
  const { updateGradingResult, removeGradingResult, requestConfirm } = useApp();
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'empty'>('all');
  const letters = useMemo(() => getActiveLetters(exam.optionCount), [exam.optionCount]);

  const rows = useMemo(() => {
    const map = new Map(result.answers.map((a) => [a.questionNumber, a]));
    return Array.from({ length: exam.questionCount }, (_, i) => {
      const qNum = i + 1;
      const ans = map.get(qNum);
      const key = exam.answerKey[qNum] || '';
      const selected: AnswerValue = ans?.selected || '';
      let outcome: 'correct' | 'wrong' | 'empty' = 'empty';
      if (!selected || ans?.status === 'empty') {
        outcome = 'empty';
      } else if (selected === 'DOUBLE' || ans?.status === 'double') {
        outcome = 'wrong';
      } else if (key && selected === key) {
        outcome = 'correct';
      } else {
        outcome = 'wrong';
      }
      return { qNum, selected, key, outcome, status: ans?.status || 'empty' };
    });
  }, [exam.answerKey, exam.questionCount, result.answers]);

  const filteredRows = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.outcome === filter)),
    [filter, rows]
  );

  const handleOverrideAnswer = async (qNum: number, newVal: AnswerValue) => {
    const existingMap = new Map(result.answers.map((a) => [a.questionNumber, a]));
    const prev = existingMap.get(qNum);
    existingMap.set(qNum, {
      questionNumber: qNum,
      selected: newVal,
      status: newVal === '' ? 'empty' : 'manual',
      confidence: 1,
      fillRatios: prev?.fillRatios,
    });
    const nextAnswers = Array.from({ length: exam.questionCount }, (_, i) => {
      const n = i + 1;
      return (
        existingMap.get(n) || {
          questionNumber: n,
          selected: '' as AnswerValue,
          status: 'empty' as const,
          confidence: 1,
        }
      );
    });
    await updateGradingResult({ ...result, answers: nextAnswers });
  };

  const handleDelete = () => {
    requestConfirm({
      title: `Hapus hasil koreksi ${result.studentName}?`,
      description: 'Data nilai ini akan dihapus dari peringkat dan analisis ujian.',
      confirmLabel: 'Hapus',
      destructive: true,
      onConfirm: async () => {
        await removeGradingResult(result.id);
        onBack();
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Back Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#131D2E] dark:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Hasil
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
        >
          <Trash2 className="h-4 w-4" />
          Hapus Hasil
        </button>
      </div>

      {/* Student Header Summary Card */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">
              {result.studentName}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {result.className || exam.className} · No. Peserta:{' '}
              {result.participantNumber || '-'} · Dipindai{' '}
              {new Date(result.scannedAt).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
          <ScoreRing score={result.score} size={72} strokeWidth={5.5} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-emerald-50 p-3.5 dark:bg-emerald-950/40">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Benar</p>
            <p className="font-mono-num mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
              {result.correctCount}
            </p>
          </div>
          <div className="rounded-2xl bg-rose-50 p-3.5 dark:bg-rose-950/40">
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">Salah</p>
            <p className="font-mono-num mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
              {result.wrongCount}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3.5 dark:bg-slate-800/70">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Kosong</p>
            <p className="font-mono-num mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
              {result.emptyCount}
            </p>
          </div>
          <div className="rounded-2xl bg-sky-50 p-3.5 dark:bg-sky-950/40">
            <p className="text-xs font-semibold text-[#1273AA] dark:text-sky-300">Ketepatan</p>
            <p className="font-mono-num mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatIndonesianNumber(result.accuracyPercent)}%
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Question-by-Question Breakdown */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Rincian Jawaban per Soal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ketuk pilihan huruf untuk mengoreksi jawaban secara manual — nilai diperbarui otomatis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            {(
              [
                ['all', `Semua (${rows.length})`],
                ['correct', `Benar (${result.correctCount})`],
                ['wrong', `Salah (${result.wrongCount})`],
                ['empty', `Kosong (${result.emptyCount})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`min-h-[36px] whitespace-nowrap rounded-xl px-3 text-xs font-bold transition ${
                  filter === key
                    ? 'bg-white text-[#1273AA] shadow-xs dark:bg-slate-700 dark:text-sky-300'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {filteredRows.map((row) => (
            <div
              key={row.qNum}
              className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-[#F9FBFD] px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono-num w-6 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {row.qNum}
                </span>
                {row.outcome === 'correct' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Benar
                  </span>
                ) : row.outcome === 'wrong' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <XCircle className="h-3.5 w-3.5" />
                    {row.selected === 'DOUBLE' ? 'Ganda' : 'Salah'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <MinusCircle className="h-3.5 w-3.5" />
                    Kosong
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {letters.map((ltr) => {
                  const active = row.selected === ltr;
                  const isKey = row.key === ltr;
                  return (
                    <button
                      key={ltr}
                      type="button"
                      onClick={() =>
                        handleOverrideAnswer(row.qNum, active ? '' : (ltr as AnswerLetter))
                      }
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                        active
                          ? row.outcome === 'correct'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                          : isKey
                            ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'border border-slate-200 bg-white text-slate-500 hover:border-[#1273AA] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {ltr}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
