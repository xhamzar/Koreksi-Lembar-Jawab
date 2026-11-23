'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Plus,
  Printer,
  Trash2,
  Users,
} from 'lucide-react';
import type { Exam, OptionCount, QuestionCount } from '@/lib/types';
import { useApp } from '@/components/providers/AppContext';
import {
  downloadLjkPdf,
  downloadLjkPng,
  renderLjkTemplateCanvas,
} from '@/lib/omr/template-renderer';
import { parseStudentsFromSpreadsheet } from '@/lib/export/exporters';

interface SheetTemplateTabProps {
  exam: Exam;
  onSaveExam: (next: Exam, toastMsg?: string) => Promise<void>;
}

export function SheetTemplateTab({ exam, onSaveExam }: SheetTemplateTabProps) {
  const {
    settings,
    students,
    upsertStudent,
    importStudentsBatch,
    removeStudent,
    pushToast,
    requestConfirm,
  } = useApp();

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentNo, setNewStudentNo] = useState('');
  const [customStudentClass, setCustomStudentClass] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const newStudentClass = customStudentClass ?? exam.className;

  useEffect(() => {
    const target = previewCanvasRef.current;
    if (!target) return;
    const rendered = renderLjkTemplateCanvas(exam, settings, 1.4);
    target.width = rendered.width;
    target.height = rendered.height;
    const ctx = target.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, target.width, target.height);
      ctx.drawImage(rendered, 0, 0);
    }
  }, [exam, settings]);

  const updateTemplate = async (patch: Partial<Exam['template']>, examPatch?: Partial<Exam>) => {
    await onSaveExam({
      ...exam,
      ...examPatch,
      template: {
        ...exam.template,
        ...patch,
      },
    });
  };

  const handlePrint = () => {
    const canvas = renderLjkTemplateCanvas(exam, settings, 2.5);
    const dataUrl = canvas.toDataURL('image/png');
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<!doctype html><html><head><title>Cetak LJK</title><style>
      @page { size: A4 portrait; margin: 0; }
      body { margin: 0; display: flex; justify-content: center; align-items: center; }
      img { width: 210mm; height: 297mm; object-fit: contain; }
    </style></head><body><img src="${dataUrl}" /></body></html>`);
    doc.close();
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1200);
    };
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) {
      pushToast({ type: 'warning', title: 'Nama siswa wajib diisi' });
      return;
    }
    await upsertStudent({
      name: newStudentName,
      participantNumber: newStudentNo,
      className: newStudentClass || exam.className,
    });
    setNewStudentName('');
    setNewStudentNo('');
    pushToast({ type: 'success', title: 'Siswa ditambahkan ke daftar kelas' });
  };

  const handleImportRoster = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = await parseStudentsFromSpreadsheet(file, exam.className);
      await importStudentsBatch(parsed);
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Gagal mengimpor berkas siswa',
        description: err instanceof Error ? err.message : 'Pastikan format CSV/Excel valid.',
      });
    }
  };

  const classStudents = students.filter(
    (s) => !exam.className || s.className.toLowerCase() === exam.className.toLowerCase()
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Template Configuration */}
        <div className="space-y-5 lg:col-span-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] sm:p-6">
            <div className="flex items-center gap-2">
              <span className="h-[2.5px] w-3.5 rounded-full bg-[#D9A741]" />
              <span className="text-xs font-bold tracking-[0.12em] text-slate-500 dark:text-slate-400">
                TEMPLATE LEMBAR JAWAB (LJK)
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {/* Question Count & Option Count */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Jumlah soal
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                    {([40, 50] as QuestionCount[]).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => updateTemplate({ questionCount: cnt }, { questionCount: cnt })}
                        className={`min-h-[40px] rounded-xl text-sm font-bold transition ${
                          exam.questionCount === cnt
                            ? 'bg-white text-[#1273AA] shadow-xs dark:bg-slate-700 dark:text-sky-300'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Pilihan jawaban
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                    {([4, 5] as OptionCount[]).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateTemplate({ optionCount: opt }, { optionCount: opt })}
                        className={`min-h-[40px] rounded-xl text-sm font-bold transition ${
                          exam.optionCount === opt
                            ? 'bg-white text-[#1273AA] shadow-xs dark:bg-slate-700 dark:text-sky-300'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {opt === 4 ? 'A–D' : 'A–E'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Header Subtitle */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Judul kop lembar jawab
                </label>
                <input
                  type="text"
                  value={exam.template.headerSubtitle}
                  onChange={(e) => updateTemplate({ headerSubtitle: e.target.value })}
                  placeholder="Contoh: ASESMEN SUMATIF SEMESTER GANJIL"
                  className="min-h-[44px] w-full rounded-2xl border border-slate-200 bg-[#F4F8FB] px-3.5 text-sm font-medium text-slate-900 outline-none focus:border-[#1273AA] focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Identity Field Toggles */}
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Kolom identitas siswa pada LJK
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['showStudentName', 'Nama Siswa'],
                      ['showSubject', 'Mata Pelajaran'],
                      ['showClass', 'Kelas / Program'],
                      ['showParticipantNumber', 'Nomor Peserta'],
                    ] as const
                  ).map(([fieldKey, label]) => {
                    const checked = exam.template.identityFields[fieldKey];
                    return (
                      <label
                        key={fieldKey}
                        className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-[#F8FBFD] px-3 text-xs font-semibold text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            updateTemplate({
                              identityFields: {
                                ...exam.template.identityFields,
                                [fieldKey]: e.target.checked,
                              },
                            })
                          }
                          className="h-4 w-4 rounded accent-[#1273AA]"
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Download & Print Actions */}
              <div className="grid grid-cols-1 gap-2.5 pt-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    downloadLjkPdf(exam, settings);
                    pushToast({ type: 'success', title: 'Template LJK PDF diunduh' });
                  }}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#1273AA] px-4 text-xs font-bold text-white transition hover:bg-[#0E5E8C]"
                >
                  <Download className="h-4 w-4" />
                  Unduh PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadLjkPng(exam, settings);
                    pushToast({ type: 'success', title: 'Template LJK PNG diunduh' });
                  }}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#E9F3FA] px-4 text-xs font-bold text-[#1273AA] transition hover:bg-[#D9ECF8] dark:bg-sky-950/60 dark:text-sky-300"
                >
                  <ImageIcon className="h-4 w-4" />
                  Unduh PNG
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Printer className="h-4 w-4" />
                  Cetak A4
                </button>
              </div>
            </div>
          </div>

          {/* Student Roster Manager */}
          <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#1273AA] dark:text-sky-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Daftar Siswa ({students.length})
                </h3>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportRoster}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Impor Excel / CSV
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Digunakan untuk memilih nama siswa dengan cepat saat menyimpan hasil pemindaian.
            </p>

            <form onSubmit={handleAddStudent} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-12">
              <input
                type="text"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Nama lengkap siswa"
                className="min-h-[42px] rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-xs font-medium text-slate-900 outline-none focus:border-[#1273AA] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:col-span-5"
              />
              <input
                type="text"
                value={newStudentNo}
                onChange={(e) => setNewStudentNo(e.target.value)}
                placeholder="No. peserta"
                className="min-h-[42px] rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-xs font-medium text-slate-900 outline-none focus:border-[#1273AA] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:col-span-3"
              />
              <input
                type="text"
                value={newStudentClass}
                onChange={(e) => setCustomStudentClass(e.target.value)}
                placeholder="Kelas"
                className="min-h-[42px] rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-xs font-medium text-slate-900 outline-none focus:border-[#1273AA] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:col-span-2"
              />
              <button
                type="submit"
                aria-label="Tambah siswa"
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[#1273AA] text-white transition hover:bg-[#0E5E8C] sm:col-span-2"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            {students.length > 0 ? (
              <div className="mt-3 max-h-52 space-y-1.5 overflow-y-auto pr-1">
                {(classStudents.length > 0 ? classStudents : students).map((stu) => (
                  <div
                    key={stu.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-[#F8FBFD] px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                        {stu.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {stu.participantNumber || 'Tanpa nomor'} · {stu.className}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: `Hapus ${stu.name}?`,
                          description: 'Siswa ini akan dihapus dari daftar pilihan kelas.',
                          confirmLabel: 'Hapus',
                          destructive: true,
                          onConfirm: () => removeStudent(stu.id),
                        })
                      }
                      aria-label={`Hapus ${stu.name}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-center text-xs text-slate-400">
                Belum ada daftar siswa. Tambahkan manual atau impor Excel/CSV.
              </p>
            )}
          </div>
        </div>

        {/* Right: Live LJK Preview */}
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] sm:p-6 lg:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pratinjau Template LJK (Siap Pindai)
            </h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              4 Penanda Sudut Otomatis
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            4 kotak hitam di sudut kertas membantu kamera meluruskan perspektif dan memisahkan hingga 3 lembar sekaligus.
          </p>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-950">
            <canvas
              ref={previewCanvasRef}
              aria-label="Pratinjau Template LJK"
              className="mx-auto h-auto w-full max-w-[420px] rounded-lg bg-white shadow-md"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
