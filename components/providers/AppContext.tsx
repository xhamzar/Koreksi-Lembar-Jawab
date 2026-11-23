'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  ActivityLog,
  AnswerLetter,
  AppSettings,
  DatabaseBackup,
  Exam,
  GradingResult,
  NavTab,
  ScanSession,
  Student,
} from '@/lib/types';
import {
  addActivity,
  clearAllSessionsAndActivities,
  deleteExamById,
  deleteResultById,
  deleteSessionById,
  deleteStudentById,
  exportDatabaseBackup,
  generateId,
  loadInitialDatabase,
  restoreDatabaseBackup,
  saveExam,
  saveResult,
  saveSession,
  saveSettings,
  saveStudent,
} from '@/lib/storage/db';
import { recalculateResultForExam } from '@/lib/grading/engine';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}

interface AppContextValue {
  isLoading: boolean;
  hasEntered: boolean;
  enterApp: () => void;
  showLanding: () => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedResultId: string | null;
  setSelectedResultId: (id: string | null) => void;

  settings: AppSettings;
  exams: Exam[];
  activeExam: Exam | null;
  students: Student[];
  results: GradingResult[];
  activeExamResults: GradingResult[];
  sessions: ScanSession[];
  activities: ActivityLog[];

  toggleTheme: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  setActiveExamId: (examId: string) => Promise<void>;
  createExam: (input?: Partial<Exam>) => Promise<Exam>;
  updateExam: (exam: Exam, logMessage?: string) => Promise<void>;
  removeExam: (examId: string) => Promise<void>;

  upsertStudent: (student: Omit<Student, 'id' | 'createdAt'> & { id?: string }) => Promise<Student>;
  importStudentsBatch: (newStudents: Student[]) => Promise<void>;
  removeStudent: (studentId: string) => Promise<void>;

  saveScannedResults: (
    newResults: GradingResult[],
    session: ScanSession
  ) => Promise<void>;
  updateGradingResult: (updated: GradingResult) => Promise<void>;
  removeGradingResult: (resultId: string) => Promise<void>;
  removeScanSession: (sessionId: string) => Promise<void>;
  clearHistory: () => Promise<void>;

  downloadBackupJson: () => Promise<void>;
  importBackupJson: (file: File) => Promise<void>;

  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;

  confirmState: ConfirmOptions | null;
  requestConfirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  id: 'main',
  schoolName: 'SEKOLAHKITA KLJ',
  schoolAddress: 'Sistem Koreksi Lembar Jawaban Pilihan Ganda',
  creatorName: 'Tim Pengajar SekolahKita',
  theme: 'light',
  activeExamId: '',
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('settings');
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<GradingResult[]>([]);
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = generateId('toast');
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const logActivity = useCallback(
    async (action: string, detail: string, category: ActivityLog['category']) => {
      const entry: ActivityLog = {
        id: generateId('act'),
        action,
        detail,
        category,
        createdAt: new Date().toISOString(),
      };
      setActivities((prev) => [entry, ...prev].slice(0, 150));
      try {
        await addActivity(entry);
      } catch {
        // Non-blocking
      }
    },
    []
  );

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    }
  }, [settings.theme]);

  // Register Service Worker for offline PWA capability with instant update propagation
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloaded = false;

    const handleControllerChange = () => {
      if (hadController && !reloaded) {
        reloaded = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => reg.update().catch(() => undefined))
      .catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Load IndexedDB on boot
  useEffect(() => {
    let active = true;
    loadInitialDatabase()
      .then((data) => {
        if (!active) return;
        setSettings(data.settings);
        setExams(data.exams);
        setStudents(data.students);
        setResults(data.results);
        setSessions(data.sessions);
        setActivities(data.activities);
      })
      .catch(() => {
        if (!active) return;
        pushToast({
          type: 'error',
          title: 'Gagal memuat penyimpanan lokal',
          description: 'Pastikan peramban mengizinkan penyimpanan IndexedDB.',
        });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pushToast]);

  const activeExam = useMemo(() => {
    if (exams.length === 0) return null;
    return exams.find((e) => e.id === settings.activeExamId) || exams[0];
  }, [exams, settings.activeExamId]);

  const activeExamResults = useMemo(() => {
    if (!activeExam) return [];
    return results.filter((r) => r.examId === activeExam.id);
  }, [results, activeExam]);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next: AppSettings = { ...settings, ...patch, id: 'main' };
      setSettings(next);
      await saveSettings(next);
    },
    [settings]
  );

  const toggleTheme = useCallback(async () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    await updateSettings({ theme: nextTheme });
  }, [settings.theme, updateSettings]);

  const setActiveExamId = useCallback(
    async (examId: string) => {
      setSelectedResultId(null);
      await updateSettings({ activeExamId: examId });
    },
    [updateSettings]
  );

  const createExam = useCallback(
    async (input?: Partial<Exam>): Promise<Exam> => {
      const now = new Date().toISOString();
      const qCount = input?.questionCount || 50;
      const optCount = input?.optionCount || 5;
      const exam: Exam = {
        id: generateId('exam'),
        examType: input?.examType || 'Sumatif Ganjil',
        subject: input?.subject || 'Matematika',
        className: input?.className || 'Kelas X',
        semester: input?.semester || 'Ganjil',
        academicYear: input?.academicYear || '2026/2027',
        questionCount: qCount,
        optionCount: optCount,
        answerKey: input?.answerKey || ({} as Record<number, AnswerLetter>),
        scoring: input?.scoring || {
          mode: 'standard_percentage',
          correctPoints: 1,
          wrongPoints: 0,
          emptyPoints: 0,
        },
        template: input?.template || {
          questionCount: qCount,
          optionCount: optCount,
          identityFields: {
            showStudentName: true,
            showSubject: true,
            showClass: true,
            showParticipantNumber: true,
          },
          headerSubtitle: `ASESMEN ${(input?.examType || 'SUMATIF GANJIL').toUpperCase()}`,
        },
        createdAt: now,
        updatedAt: now,
      };
      await saveExam(exam);
      setExams((prev) => [exam, ...prev]);
      await updateSettings({ activeExamId: exam.id });
      await logActivity(
        'Ujian baru dibuat',
        `${exam.examType} · ${exam.subject} · ${exam.className}`,
        'exam'
      );
      pushToast({
        type: 'success',
        title: 'Ujian baru ditambahkan',
        description: `${exam.examType} · ${exam.subject} · ${exam.className}`,
      });
      return exam;
    },
    [logActivity, pushToast, updateSettings]
  );

  const updateExam = useCallback(
    async (exam: Exam, logMessage?: string) => {
      const updatedExam: Exam = { ...exam, updatedAt: new Date().toISOString() };
      await saveExam(updatedExam);
      setExams((prev) => prev.map((e) => (e.id === updatedExam.id ? updatedExam : e)));

      // Recalculate all results belonging to this exam automatically
      const affected = results.filter((r) => r.examId === updatedExam.id);
      if (affected.length > 0) {
        const recalculated = affected.map((r) => recalculateResultForExam(updatedExam, r));
        await Promise.all(recalculated.map((r) => saveResult(r)));
        const recalcMap = new Map(recalculated.map((r) => [r.id, r]));
        setResults((prev) => prev.map((r) => recalcMap.get(r.id) || r));
      }

      if (logMessage) {
        await logActivity(
          logMessage,
          `${updatedExam.examType} · ${updatedExam.subject} · ${updatedExam.className}`,
          'exam'
        );
      }
    },
    [logActivity, results]
  );

  const removeExam = useCallback(
    async (examId: string) => {
      const target = exams.find((e) => e.id === examId);
      await deleteExamById(examId);
      const remaining = exams.filter((e) => e.id !== examId);
      setExams(remaining);
      setResults((prev) => prev.filter((r) => r.examId !== examId));
      setSessions((prev) => prev.filter((s) => s.examId !== examId));
      if (settings.activeExamId === examId) {
        await updateSettings({ activeExamId: remaining[0]?.id || '' });
      }
      if (target) {
        await logActivity(
          'Ujian dihapus',
          `${target.examType} · ${target.subject} · ${target.className}`,
          'exam'
        );
      }
      pushToast({ type: 'info', title: 'Data ujian berhasil dihapus' });
    },
    [exams, logActivity, pushToast, settings.activeExamId, updateSettings]
  );

  const upsertStudent = useCallback(
    async (input: Omit<Student, 'id' | 'createdAt'> & { id?: string }): Promise<Student> => {
      const existing = input.id ? students.find((s) => s.id === input.id) : undefined;
      const student: Student = {
        id: existing?.id || generateId('stu'),
        name: input.name.trim(),
        participantNumber: input.participantNumber.trim(),
        className: input.className.trim(),
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      await saveStudent(student);
      setStudents((prev) => {
        const without = prev.filter((s) => s.id !== student.id);
        return [...without, student].sort((a, b) => a.name.localeCompare(b.name, 'id'));
      });
      return student;
    },
    [students]
  );

  const importStudentsBatch = useCallback(
    async (newStudents: Student[]) => {
      await Promise.all(newStudents.map((s) => saveStudent(s)));
      setStudents((prev) => {
        const merged = [...prev, ...newStudents];
        return merged.sort((a, b) => a.name.localeCompare(b.name, 'id'));
      });
      await logActivity('Impor data siswa', `${newStudents.length} siswa ditambahkan dari berkas`, 'data');
      pushToast({
        type: 'success',
        title: `${newStudents.length} siswa berhasil diimpor`,
      });
    },
    [logActivity, pushToast]
  );

  const removeStudent = useCallback(
    async (studentId: string) => {
      await deleteStudentById(studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      pushToast({ type: 'info', title: 'Data siswa dihapus' });
    },
    [pushToast]
  );

  const saveScannedResults = useCallback(
    async (newResults: GradingResult[], session: ScanSession) => {
      await Promise.all(newResults.map((r) => saveResult(r)));
      await saveSession(session);
      setResults((prev) => [...newResults, ...prev]);
      setSessions((prev) => [session, ...prev]);
      await logActivity(
        `Pemindaian ${newResults.length} lembar disimpan`,
        `${session.examLabel} · ${session.className}`,
        'scan'
      );
      pushToast({
        type: 'success',
        title: `${newResults.length} hasil koreksi tersimpan`,
        description: 'Peringkat dan analisis soal telah diperbarui otomatis.',
      });
    },
    [logActivity, pushToast]
  );

  const updateGradingResult = useCallback(
    async (updated: GradingResult) => {
      const targetExam = exams.find((e) => e.id === updated.examId) || activeExam;
      const evaluated = targetExam ? recalculateResultForExam(targetExam, updated) : updated;
      await saveResult(evaluated);
      setResults((prev) => prev.map((r) => (r.id === evaluated.id ? evaluated : r)));
      await logActivity(
        'Koreksi manual diperbarui',
        `${evaluated.studentName} · Nilai akhir ${evaluated.score}`,
        'result'
      );
      pushToast({
        type: 'success',
        title: 'Perubahan nilai disimpan',
        description: `${evaluated.studentName} — Nilai: ${evaluated.score}`,
      });
    },
    [activeExam, exams, logActivity, pushToast]
  );

  const removeGradingResult = useCallback(
    async (resultId: string) => {
      const target = results.find((r) => r.id === resultId);
      await deleteResultById(resultId);
      setResults((prev) => prev.filter((r) => r.id !== resultId));
      if (selectedResultId === resultId) setSelectedResultId(null);
      if (target) {
        await logActivity('Hasil siswa dihapus', target.studentName, 'result');
      }
      pushToast({ type: 'info', title: 'Hasil koreksi siswa dihapus' });
    },
    [logActivity, pushToast, results, selectedResultId]
  );

  const removeScanSession = useCallback(
    async (sessionId: string) => {
      await deleteSessionById(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      pushToast({ type: 'info', title: 'Riwayat sesi dihapus' });
    },
    [pushToast]
  );

  const clearHistory = useCallback(async () => {
    await clearAllSessionsAndActivities();
    setSessions([]);
    setActivities([]);
    pushToast({ type: 'info', title: 'Riwayat pemindaian dan aktivitas dibersihkan' });
  }, [pushToast]);

  const downloadBackupJson = useCallback(async () => {
    const backup = await exportDatabaseBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cadangan_koreksi_ljk_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    await logActivity('Cadangan database diekspor', 'Berkas JSON disimpan ke perangkat', 'data');
    pushToast({ type: 'success', title: 'Cadangan database berhasil diunduh' });
  }, [logActivity, pushToast]);

  const importBackupJson = useCallback(
    async (file: File) => {
      const text = await file.text();
      const parsed = JSON.parse(text) as DatabaseBackup;
      await restoreDatabaseBackup(parsed);
      const fresh = await loadInitialDatabase();
      setSettings(fresh.settings);
      setExams(fresh.exams);
      setStudents(fresh.students);
      setResults(fresh.results);
      setSessions(fresh.sessions);
      setActivities(fresh.activities);
      await logActivity('Database dipulihkan', `Dipulihkan dari ${file.name}`, 'data');
      pushToast({
        type: 'success',
        title: 'Database berhasil dipulihkan',
        description: `${fresh.exams.length} ujian dan ${fresh.results.length} hasil siswa dimuat.`,
      });
    },
    [logActivity, pushToast]
  );

  const requestConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(null);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      isLoading,
      hasEntered,
      enterApp: () => setHasEntered(true),
      showLanding: () => setHasEntered(false),
      activeTab,
      setActiveTab: (tab) => {
        setSelectedResultId(null);
        setActiveTab(tab);
      },
      selectedResultId,
      setSelectedResultId,
      settings,
      exams,
      activeExam,
      students,
      results,
      activeExamResults,
      sessions,
      activities,
      toggleTheme,
      updateSettings,
      setActiveExamId,
      createExam,
      updateExam,
      removeExam,
      upsertStudent,
      importStudentsBatch,
      removeStudent,
      saveScannedResults,
      updateGradingResult,
      removeGradingResult,
      removeScanSession,
      clearHistory,
      downloadBackupJson,
      importBackupJson,
      toasts,
      pushToast,
      dismissToast,
      confirmState,
      requestConfirm,
      closeConfirm,
    }),
    [
      isLoading,
      hasEntered,
      activeTab,
      selectedResultId,
      settings,
      exams,
      activeExam,
      students,
      results,
      activeExamResults,
      sessions,
      activities,
      toggleTheme,
      updateSettings,
      setActiveExamId,
      createExam,
      updateExam,
      removeExam,
      upsertStudent,
      importStudentsBatch,
      removeStudent,
      saveScannedResults,
      updateGradingResult,
      removeGradingResult,
      removeScanSession,
      clearHistory,
      downloadBackupJson,
      importBackupJson,
      toasts,
      pushToast,
      dismissToast,
      confirmState,
      requestConfirm,
      closeConfirm,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus digunakan di dalam AppProvider');
  return ctx;
}
