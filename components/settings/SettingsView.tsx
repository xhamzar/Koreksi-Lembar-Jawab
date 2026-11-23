'use client';

import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Calculator,
  ClipboardList,
  FileText,
  KeyRound,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppContext';
import type { AppSettings, Exam } from '@/lib/types';
import { AnswerKeyTab } from '@/components/settings/AnswerKeyTab';
import { SheetTemplateTab } from '@/components/settings/SheetTemplateTab';
import { PWAInstallButton } from '@/components/ui/AppOverlays';

type SettingsSubTab = 'jenis' | 'kunci' | 'lembar';

const EXAM_TYPES = [
  'Sumatif Ganjil',
  'Sumatif Genap',
  'Penilaian Tengah Semester (PTS)',
  'Penilaian Akhir Semester (PAS)',
  'Ulangan Harian',
  'Try Out',
  'Ujian Sekolah',
];

function ExamInfoPanel({
  exam,
  settings,
  onSaveExam,
  onGoToAnswerKey,
  onUpdateSettings,
  pushToast,
}: {
  exam: Exam;
  settings: AppSettings;
  onSaveExam: (next: Exam, toastMsg?: string) => Promise<void>;
  onGoToAnswerKey: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  pushToast: (toast: { type: 'success' | 'error' | 'info' | 'warning'; title: string; description?: string }) => void;
}) {
  const [formState, setFormState] = useState({
    examType: exam.examType,
    subject: exam.subject,
    className: exam.className,
    semester: exam.semester,
    academicYear: exam.academicYear,
    scoringMode: exam.scoring.mode,
    correctPoints: exam.scoring.correctPoints,
    wrongPoints: exam.scoring.wrongPoints,
    emptyPoints: exam.scoring.emptyPoints,
  });

  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [schoolAddress, setSchoolAddress] = useState(settings.schoolAddress);
  const [creatorName, setCreatorName] = useState(settings.creatorName);
  const emblemInputRef = useRef<HTMLInputElement>(null);

  const persistExamFields = async (nextFields: typeof formState, toastMessage?: string) => {
    if (!nextFields.subject.trim() || !nextFields.className.trim()) {
      if (toastMessage) {
        pushToast({ type: 'warning', title: 'Lengkapi mata pelajaran dan kelas' });
      }
      return;
    }

    const updated: Exam = {
      ...exam,
      examType: nextFields.examType,
      subject: nextFields.subject.trim(),
      className: nextFields.className.trim(),
      semester: nextFields.semester,
      academicYear: nextFields.academicYear.trim() || '2026/2027',
      scoring: {
        mode: nextFields.scoringMode,
        correctPoints: Number(nextFields.correctPoints) || 1,
        wrongPoints: Number(nextFields.wrongPoints) || 0,
        emptyPoints: Number(nextFields.emptyPoints) || 0,
      },
    };
    await onSaveExam(updated, toastMessage);
  };

  const handleSaveSchoolProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      pushToast({ type: 'warning', title: 'Nama sekolah tidak boleh kosong' });
      return;
    }
    await onUpdateSettings({
      schoolName: schoolName.trim(),
      schoolAddress: schoolAddress.trim(),
      creatorName: creatorName.trim() || 'Tim Pengajar SekolahKita',
    });
    pushToast({ type: 'success', title: 'Identitas sekolah & pembuat disimpan' });
  };

  const handleUploadEmblem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      pushToast({ type: 'error', title: 'Pilih berkas gambar PNG atau JPG' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        await onUpdateSettings({ customEmblemDataUrl: reader.result });
        pushToast({ type: 'success', title: 'Logo sekolah diperbarui' });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Primary Exam Info Form (matches reference card) */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] sm:p-6 lg:col-span-7">
        <div className="flex items-center gap-2">
          <span className="h-[2.5px] w-3.5 rounded-full bg-[#D9A741]" />
          <span className="text-xs font-bold tracking-[0.12em] text-slate-500 dark:text-slate-400">
            JENIS UJIAN
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Jenis
            </label>
            <select
              value={formState.examType}
              onChange={(e) => {
                const next = { ...formState, examType: e.target.value };
                setFormState(next);
                persistExamFields(next);
              }}
              className="min-h-[48px] w-full rounded-2xl border border-slate-200/80 bg-[#F1F6FA] px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#1273AA] focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Mata pelajaran
              </label>
              <input
                type="text"
                value={formState.subject}
                onChange={(e) => setFormState((prev) => ({ ...prev, subject: e.target.value }))}
                onBlur={() => persistExamFields(formState)}
                placeholder="Contoh: Kimia"
                className="min-h-[48px] w-full rounded-2xl border border-slate-200/80 bg-[#F1F6FA] px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#1273AA] focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Kelas
              </label>
              <input
                type="text"
                value={formState.className}
                onChange={(e) => setFormState((prev) => ({ ...prev, className: e.target.value }))}
                onBlur={() => persistExamFields(formState)}
                placeholder="Contoh: Kelas X"
                className="min-h-[48px] w-full rounded-2xl border border-slate-200/80 bg-[#F1F6FA] px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#1273AA] focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Semester
              </label>
              <select
                value={formState.semester}
                onChange={(e) => {
                  const next = { ...formState, semester: e.target.value };
                  setFormState(next);
                  persistExamFields(next);
                }}
                className="min-h-[48px] w-full rounded-2xl border border-slate-200/80 bg-[#F1F6FA] px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#1273AA] focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Tahun ajaran
              </label>
              <input
                type="text"
                value={formState.academicYear}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, academicYear: e.target.value }))
                }
                onBlur={() => persistExamFields(formState)}
                placeholder="2026/2027"
                className="min-h-[48px] w-full rounded-2xl border border-slate-200/80 bg-[#F1F6FA] px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#1273AA] focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Action Buttons matching reference */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => persistExamFields(formState, 'Pengaturan ujian disimpan')}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#E9F3FA] px-5 text-sm font-bold text-[#1273AA] transition hover:bg-[#D9ECF8] dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/60 sm:flex-none"
            >
              <Save className="h-4 w-4" />
              Simpan
            </button>
            <button
              type="button"
              onClick={async () => {
                await persistExamFields(formState);
                onGoToAnswerKey();
              }}
              className="inline-flex min-h-[48px] flex-[1.4] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#1273AA] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#0E5E8C] sm:flex-1"
            >
              <span>Kunci Jawaban</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Scoring Rules & School Branding */}
      <div className="space-y-5 lg:col-span-5">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E]">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[#1273AA] dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Metode Penilaian
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Rumus standar: (Benar ÷ Total Soal) × 100.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                const next = {
                  ...formState,
                  scoringMode: 'standard_percentage' as const,
                  correctPoints: 1,
                  wrongPoints: 0,
                  emptyPoints: 0,
                };
                setFormState(next);
                persistExamFields(next, 'Metode penilaian standar diaktifkan');
              }}
              className={`min-h-[38px] rounded-xl text-xs font-bold transition ${
                formState.scoringMode === 'standard_percentage'
                  ? 'bg-white text-[#1273AA] shadow-xs dark:bg-slate-700 dark:text-sky-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Standar (0–100)
            </button>
            <button
              type="button"
              onClick={() => {
                const next = { ...formState, scoringMode: 'weighted' as const };
                setFormState(next);
                persistExamFields(next, 'Metode bobot kustom diaktifkan');
              }}
              className={`min-h-[38px] rounded-xl text-xs font-bold transition ${
                formState.scoringMode === 'weighted'
                  ? 'bg-white text-[#1273AA] shadow-xs dark:bg-slate-700 dark:text-sky-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Bobot Kustom
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                Benar
              </label>
              <input
                type="number"
                step="0.5"
                disabled={formState.scoringMode === 'standard_percentage'}
                value={formState.correctPoints}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, correctPoints: Number(e.target.value) }))
                }
                onBlur={() => persistExamFields(formState)}
                className="font-mono-num min-h-[40px] w-full rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-sm font-bold text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                Salah
              </label>
              <input
                type="number"
                step="0.5"
                disabled={formState.scoringMode === 'standard_percentage'}
                value={formState.wrongPoints}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, wrongPoints: Number(e.target.value) }))
                }
                onBlur={() => persistExamFields(formState)}
                className="font-mono-num min-h-[40px] w-full rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-sm font-bold text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Kosong
              </label>
              <input
                type="number"
                step="0.5"
                disabled={formState.scoringMode === 'standard_percentage'}
                value={formState.emptyPoints}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, emptyPoints: Number(e.target.value) }))
                }
                onBlur={() => persistExamFields(formState)}
                className="font-mono-num min-h-[40px] w-full rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-sm font-bold text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* School Identity Customization */}
        <form
          onSubmit={handleSaveSchoolProfile}
          className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#1273AA] dark:text-sky-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Identitas Sekolah & Pembuat
              </h2>
            </div>
            <input
              ref={emblemInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleUploadEmblem}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => emblemInputRef.current?.click()}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              <Upload className="h-3.5 w-3.5" />
              Ganti Logo
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Nama Sekolah
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#1273AA] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Alamat / Keterangan Kop LJK
              </label>
              <input
                type="text"
                value={schoolAddress}
                onChange={(e) => setSchoolAddress(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-xs font-medium text-slate-900 outline-none focus:border-[#1273AA] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Nama Guru / Pembuat
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#1273AA] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="mt-1 min-h-[42px] w-full rounded-xl bg-slate-900 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              Simpan Identitas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SettingsView() {
  const {
    settings,
    exams,
    activeExam,
    setActiveExamId,
    createExam,
    updateExam,
    removeExam,
    updateSettings,
    setActiveTab,
    pushToast,
    requestConfirm,
  } = useApp();

  const [subTab, setSubTab] = useState<SettingsSubTab>('jenis');

  const handleExamSave = async (next: Exam, toastMsg?: string) => {
    await updateExam(next, toastMsg);
    if (toastMsg) {
      pushToast({ type: 'success', title: toastMsg });
    }
  };

  const handleDeleteActiveExam = () => {
    if (!activeExam) return;
    requestConfirm({
      title: `Hapus ujian "${activeExam.examType} · ${activeExam.subject}"?`,
      description:
        'Kunci jawaban, hasil siswa, dan riwayat pemindaian untuk ujian ini akan dihapus secara permanen dari perangkat.',
      confirmLabel: 'Hapus Ujian',
      destructive: true,
      onConfirm: () => removeExam(activeExam.id),
    });
  };

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-balance text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Pengaturan ujian
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Atur jenis ujian dan kunci jawaban. Perubahan tersimpan otomatis.
          </p>
        </div>
        <div className="lg:hidden">
          <PWAInstallButton variant="light" />
        </div>
      </div>

      {/* Active Exam Selector Card */}
      <section className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] sm:p-5">
        <label
          htmlFor="active-exam-select"
          className="block text-xs font-semibold text-slate-500 dark:text-slate-400"
        >
          Ujian aktif
        </label>
        <div className="mt-2 flex items-center gap-2.5">
          {exams.length > 0 && activeExam ? (
            <select
              id="active-exam-select"
              value={activeExam.id}
              onChange={(e) => setActiveExamId(e.target.value)}
              className="min-h-[48px] min-w-0 flex-1 truncate rounded-2xl border border-slate-200/80 bg-[#F1F6FA] px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#1273AA] focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.examType} · {ex.subject} · {ex.className}
                  {ex.isSample ? ' (Contoh)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex min-h-[48px] flex-1 items-center rounded-2xl bg-[#F1F6FA] px-4 text-sm text-slate-500 dark:bg-slate-900">
              Belum ada ujian — ketuk tombol + untuk membuat
            </div>
          )}

          <button
            type="button"
            onClick={() => createExam()}
            aria-label="Tambah ujian baru"
            title="Tambah ujian baru"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-xs transition hover:border-[#1273AA] hover:bg-[#E9F3FA] hover:text-[#1273AA] active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <Plus className="h-5 w-5" />
          </button>

          {activeExam && (
            <button
              type="button"
              onClick={handleDeleteActiveExam}
              aria-label="Hapus ujian aktif"
              title="Hapus ujian aktif"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {/* 3 Sub-Tabs */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {(
          [
            { id: 'jenis', label: 'Jenis Ujian', icon: ClipboardList },
            { id: 'kunci', label: 'Kunci Jawaban', icon: KeyRound },
            { id: 'lembar', label: 'Lembar Jawab', icon: FileText },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-bold transition active:scale-[0.98] sm:flex-row sm:gap-2 sm:text-sm ${
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

      {!activeExam ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-[#131D2E]">
          <p className="text-base font-bold text-slate-900 dark:text-white">
            Belum ada ujian terdaftar
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Buat ujian pertama Anda untuk mulai mengatur kunci jawaban dan memindai LJK.
          </p>
          <button
            type="button"
            onClick={() => createExam()}
            className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-[#1273AA] px-6 text-sm font-bold text-white hover:bg-[#0E5E8C]"
          >
            <Plus className="h-4 w-4" />
            Buat Ujian Baru
          </button>
        </div>
      ) : subTab === 'jenis' ? (
        <ExamInfoPanel
          key={`${activeExam.id}_${settings.schoolName}_${settings.creatorName}`}
          exam={activeExam}
          settings={settings}
          onSaveExam={handleExamSave}
          onGoToAnswerKey={() => setSubTab('kunci')}
          onUpdateSettings={updateSettings}
          pushToast={pushToast}
        />
      ) : subTab === 'kunci' ? (
        <AnswerKeyTab
          exam={activeExam}
          onSaveExam={handleExamSave}
          onGoToScanner={() => setActiveTab('scanner')}
        />
      ) : (
        <SheetTemplateTab exam={activeExam} onSaveExam={handleExamSave} />
      )}
    </div>
  );
}
