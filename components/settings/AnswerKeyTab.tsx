'use client';

import React, { useMemo } from 'react';
import { ArrowRight, Check, RotateCcw, Save } from 'lucide-react';
import type { AnswerLetter, Exam, QuestionCount } from '@/lib/types';
import { getActiveLetters } from '@/lib/grading/engine';
import { useApp } from '@/components/providers/AppContext';

interface AnswerKeyTabProps {
  exam: Exam;
  onSaveExam: (next: Exam, toastMsg?: string) => Promise<void>;
  onGoToScanner: () => void;
}

export function AnswerKeyTab({ exam, onSaveExam, onGoToScanner }: AnswerKeyTabProps) {
  const { requestConfirm } = useApp();
  const letters = useMemo(() => getActiveLetters(exam.optionCount), [exam.optionCount]);
  const rowsPerCol = exam.questionCount / 2;

  const filledCount = useMemo(() => {
    let count = 0;
    for (let q = 1; q <= exam.questionCount; q++) {
      if (exam.answerKey[q]) count++;
    }
    return count;
  }, [exam.answerKey, exam.questionCount]);

  const handleToggleOption = async (qNum: number, letter: AnswerLetter) => {
    const nextKey = { ...exam.answerKey };
    if (nextKey[qNum] === letter) {
      delete nextKey[qNum];
    } else {
      nextKey[qNum] = letter;
    }
    await onSaveExam({ ...exam, answerKey: nextKey });
  };

  const handleQuestionCountChange = async (qCount: QuestionCount) => {
    await onSaveExam(
      {
        ...exam,
        questionCount: qCount,
        template: { ...exam.template, questionCount: qCount },
      },
      `Jumlah soal diubah menjadi ${qCount} nomor`
    );
  };

  const handleClearKey = () => {
    requestConfirm({
      title: 'Kosongkan semua kunci jawaban?',
      description: `Seluruh kunci jawaban untuk ${exam.examType} · ${exam.subject} akan dikosongkan.`,
      confirmLabel: 'Ya, Kosongkan',
      destructive: true,
      onConfirm: async () => {
        await onSaveExam({ ...exam, answerKey: {} }, 'Kunci jawaban dikosongkan');
      },
    });
  };

  const renderColumn = (startQ: number, endQ: number) => (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[2.25rem_1fr] items-center gap-2 px-1 pb-1 text-xs font-bold text-slate-400 dark:text-slate-500">
        <span className="text-center">No</span>
        <div
          className="grid gap-1.5 text-center"
          style={{ gridTemplateColumns: `repeat(${letters.length}, minmax(0, 1fr))` }}
        >
          {letters.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>

      {Array.from({ length: endQ - startQ + 1 }, (_, i) => startQ + i).map((qNum) => {
        const selected = exam.answerKey[qNum];
        return (
          <div
            key={qNum}
            className="grid grid-cols-[2.25rem_1fr] items-center gap-2 rounded-2xl px-1 py-1 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <span className="font-mono-num text-center text-xs font-bold text-slate-600 dark:text-slate-400">
              {qNum}
            </span>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${letters.length}, minmax(0, 1fr))` }}
            >
              {letters.map((letter) => {
                const active = selected === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleToggleOption(qNum, letter)}
                    aria-label={`Soal ${qNum} pilihan ${letter}`}
                    aria-pressed={active}
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition active:scale-95 sm:h-10 sm:w-10 ${
                      active
                        ? 'bg-[#1273AA] text-white shadow-sm shadow-[#1273AA]/30'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-[#1273AA]/50 hover:text-[#1273AA] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const progressPct = Math.round((filledCount / exam.questionCount) * 100);

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-[2.5px] w-3.5 rounded-full bg-[#D9A741]" />
            <span className="text-xs font-bold tracking-[0.12em] text-slate-500 dark:text-slate-400">
              KUNCI JAWABAN
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Ketuk bulatan untuk menetapkan kunci. Terisi{' '}
            <span className="font-mono-num font-bold text-slate-900 dark:text-white">
              {filledCount}/{exam.questionCount}
            </span>{' '}
            soal ({progressPct}%).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {([40, 50] as QuestionCount[]).map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => handleQuestionCountChange(cnt)}
                className={`min-h-[36px] rounded-lg px-3 text-xs font-bold transition ${
                  exam.questionCount === cnt
                    ? 'bg-white text-[#1273AA] shadow-xs dark:bg-slate-700 dark:text-sky-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {cnt} Soal
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleClearKey}
            title="Kosongkan kunci jawaban"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-[#1273AA] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Two-column Bubble Grid */}
      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        {renderColumn(1, rowsPerCol)}
        {renderColumn(rowsPerCol + 1, exam.questionCount)}
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          Perubahan tersimpan otomatis ke perangkat
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onSaveExam(exam, 'Kunci jawaban berhasil disimpan')}
            className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#E9F3FA] px-5 text-sm font-bold text-[#1273AA] transition hover:bg-[#D9ECF8] dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/60 sm:flex-none"
          >
            <Save className="h-4 w-4" />
            Simpan Kunci
          </button>
          <button
            type="button"
            onClick={onGoToScanner}
            className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#1273AA] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0E5E8C] sm:flex-none"
          >
            Mulai Pindai
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
