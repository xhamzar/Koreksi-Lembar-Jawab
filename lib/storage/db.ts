import type {
  ActivityLog,
  AnswerLetter,
  AppSettings,
  DatabaseBackup,
  Exam,
  GradingResult,
  QuestionAnswerDetail,
  ScanSession,
  Student,
} from '@/lib/types';
import { evaluateAnswers } from '@/lib/grading/engine';

const DB_NAME = 'koreksi_ljk_local_db';
const DB_VERSION = 1;

const STORES = {
  settings: 'settings',
  exams: 'exams',
  students: 'students',
  results: 'results',
  sessions: 'sessions',
  activities: 'activities',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB tidak tersedia pada peramban ini.'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.exams)) {
        db.createObjectStore(STORES.exams, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.students)) {
        const store = db.createObjectStore(STORES.students, { keyPath: 'id' });
        store.createIndex('className', 'className', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.results)) {
        const store = db.createObjectStore(STORES.results, { keyPath: 'id' });
        store.createIndex('examId', 'examId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.sessions)) {
        const store = db.createObjectStore(STORES.sessions, { keyPath: 'id' });
        store.createIndex('examId', 'examId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.activities)) {
        db.createObjectStore(STORES.activities, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Gagal membuka IndexedDB'));
    };
  });

  return dbPromise;
}

async function runTx<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = operation(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Operasi IndexedDB gagal'));
  });
}

export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const SAMPLE_KEY_SEQUENCE: AnswerLetter[] = [
  'B', 'C', 'D', 'A', 'B', 'B', 'E', 'D', 'A', 'C',
  'E', 'B', 'A', 'C', 'D', 'B', 'C', 'E', 'A', 'D',
  'C', 'B', 'A', 'D', 'E', 'A', 'C', 'B', 'E', 'D',
  'B', 'C', 'C', 'A', 'E', 'D', 'B', 'A', 'C', 'D',
  'E', 'A', 'B', 'D', 'C', 'B', 'E', 'A', 'C', 'D',
];

function buildSampleExam(): Exam {
  const now = new Date().toISOString();
  const answerKey: Record<number, AnswerLetter> = {};
  for (let i = 1; i <= 50; i++) {
    answerKey[i] = SAMPLE_KEY_SEQUENCE[i - 1];
  }
  return {
    id: 'exam_sample_kimia_x',
    examType: 'Sumatif Ganjil',
    subject: 'Kimia',
    className: 'Kelas X',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    questionCount: 50,
    optionCount: 5,
    answerKey,
    scoring: {
      mode: 'standard_percentage',
      correctPoints: 1,
      wrongPoints: 0,
      emptyPoints: 0,
    },
    template: {
      questionCount: 50,
      optionCount: 5,
      identityFields: {
        showStudentName: true,
        showSubject: true,
        showClass: true,
        showParticipantNumber: true,
      },
      headerSubtitle: 'ASESMEN SUMATIF SEMESTER GANJIL',
    },
    isSample: true,
    createdAt: now,
    updatedAt: now,
  };
}

function buildSampleAnswers(
  exam: Exam,
  correctCountTarget: number,
  wrongCountTarget: number,
  emptyCountTarget: number
): QuestionAnswerDetail[] {
  const letters: AnswerLetter[] = ['A', 'B', 'C', 'D', 'E'];
  const details: QuestionAnswerDetail[] = [];

  for (let q = 1; q <= exam.questionCount; q++) {
    const key = exam.answerKey[q];
    if (q <= correctCountTarget) {
      details.push({
        questionNumber: q,
        selected: key,
        status: 'confident',
        confidence: 0.94,
      });
    } else if (q <= correctCountTarget + wrongCountTarget) {
      const wrongLetter = letters[(letters.indexOf(key) + 1) % letters.length];
      details.push({
        questionNumber: q,
        selected: wrongLetter,
        status: 'confident',
        confidence: 0.89,
      });
    } else if (q <= correctCountTarget + wrongCountTarget + emptyCountTarget) {
      details.push({
        questionNumber: q,
        selected: '',
        status: 'empty',
        confidence: 0.96,
      });
    } else {
      details.push({
        questionNumber: q,
        selected: key,
        status: 'confident',
        confidence: 0.92,
      });
    }
  }
  return details;
}

export async function loadInitialDatabase(): Promise<{
  settings: AppSettings;
  exams: Exam[];
  students: Student[];
  results: GradingResult[];
  sessions: ScanSession[];
  activities: ActivityLog[];
}> {
  const [settingsRaw, examsRaw, studentsRaw, resultsRaw, sessionsRaw, activitiesRaw] =
    await Promise.all([
      runTx<AppSettings | undefined>(STORES.settings, 'readonly', (s) => s.get('main')),
      runTx<Exam[]>(STORES.exams, 'readonly', (s) => s.getAll()),
      runTx<Student[]>(STORES.students, 'readonly', (s) => s.getAll()),
      runTx<GradingResult[]>(STORES.results, 'readonly', (s) => s.getAll()),
      runTx<ScanSession[]>(STORES.sessions, 'readonly', (s) => s.getAll()),
      runTx<ActivityLog[]>(STORES.activities, 'readonly', (s) => s.getAll()),
    ]);

  if (!settingsRaw) {
    const sampleExam = buildSampleExam();
    const now = new Date().toISOString();

    const sampleStudents: Student[] = [
      { id: 'stu_sample_1', name: 'Budi', participantNumber: '2026-001', className: 'Kelas X', createdAt: now },
      { id: 'stu_sample_2', name: 'Ari', participantNumber: '2026-002', className: 'Kelas X', createdAt: now },
      { id: 'stu_sample_3', name: 'Cahya', participantNumber: '2026-003', className: 'Kelas X', createdAt: now },
      { id: 'stu_sample_4', name: 'Dewi Lestari', participantNumber: '2026-004', className: 'Kelas X', createdAt: now },
      { id: 'stu_sample_5', name: 'Eko Pratama', participantNumber: '2026-005', className: 'Kelas X', createdAt: now },
    ];

    const sampleSpecs: Array<{
      id: string;
      student: Student;
      correct: number;
      wrong: number;
      empty: number;
    }> = [
      { id: 'res_sample_budi', student: sampleStudents[0], correct: 42, wrong: 5, empty: 3 },
      { id: 'res_sample_ari', student: sampleStudents[1], correct: 38, wrong: 7, empty: 5 },
      { id: 'res_sample_cahya', student: sampleStudents[2], correct: 12, wrong: 36, empty: 2 },
    ];

    const sampleResults: GradingResult[] = sampleSpecs.map((spec) => {
      const answers = buildSampleAnswers(sampleExam, spec.correct, spec.wrong, spec.empty);
      const metrics = evaluateAnswers(sampleExam, answers);
      return {
        id: spec.id,
        examId: sampleExam.id,
        studentId: spec.student.id,
        studentName: spec.student.name,
        participantNumber: spec.student.participantNumber,
        className: spec.student.className,
        answers,
        ...metrics,
        scannedAt: now,
        updatedAt: now,
      };
    });

    const sampleSession: ScanSession = {
      id: 'sess_sample_1',
      examId: sampleExam.id,
      examLabel: `${sampleExam.examType} · ${sampleExam.subject}`,
      className: sampleExam.className,
      source: 'upload',
      sheetCount: 3,
      resultIds: sampleResults.map((r) => r.id),
      processingMs: 640,
      engineUsed: 'pixel-native',
      createdAt: now,
    };

    const initialActivity: ActivityLog = {
      id: 'act_sample_init',
      action: 'Ujian contoh disiapkan',
      detail: 'Sumatif Ganjil · Kimia · Kelas X (50 soal, 3 siswa contoh)',
      category: 'exam',
      createdAt: now,
    };

    const defaultSettings: AppSettings = {
      id: 'main',
      schoolName: 'SEKOLAHKITA KLJ',
      schoolAddress: 'Sistem Koreksi Lembar Jawaban Pilihan Ganda',
      creatorName: 'Tim Pengajar SekolahKita',
      theme: 'light',
      activeExamId: sampleExam.id,
      seededSampleV1: true,
    };

    await saveSettings(defaultSettings);
    await saveExam(sampleExam);
    await Promise.all(sampleStudents.map((s) => saveStudent(s)));
    await Promise.all(sampleResults.map((r) => saveResult(r)));
    await saveSession(sampleSession);
    await addActivity(initialActivity);

    return {
      settings: defaultSettings,
      exams: [sampleExam],
      students: sampleStudents,
      results: sampleResults,
      sessions: [sampleSession],
      activities: [initialActivity],
    };
  }

  // Non-destructive migration of untouched previous defaults to SEKOLAHKITA KLJ
  let migratedSettings = settingsRaw;
  const needsMigration =
    settingsRaw.schoolName === 'SMA Negeri 3 Paloh' ||
    settingsRaw.creatorName === 'Aras Hidayat, S.Pd';

  if (needsMigration) {
    migratedSettings = {
      ...settingsRaw,
      schoolName:
        settingsRaw.schoolName === 'SMA Negeri 3 Paloh'
          ? 'SEKOLAHKITA KLJ'
          : settingsRaw.schoolName,
      schoolAddress:
        settingsRaw.schoolAddress === 'Jalan Raya Sei Sumpit, Kecamatan Paloh, Kab. Sambas'
          ? 'Sistem Koreksi Lembar Jawaban Pilihan Ganda'
          : settingsRaw.schoolAddress,
      creatorName:
        settingsRaw.creatorName === 'Aras Hidayat, S.Pd'
          ? 'Tim Pengajar SekolahKita'
          : settingsRaw.creatorName,
    };
    await saveSettings(migratedSettings);
  }

  return {
    settings: migratedSettings,
    exams: examsRaw.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    students: studentsRaw.sort((a, b) => a.name.localeCompare(b.name, 'id')),
    results: resultsRaw.sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)),
    sessions: sessionsRaw.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    activities: activitiesRaw.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 150),
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await runTx(STORES.settings, 'readwrite', (s) => s.put(settings));
}

export async function saveExam(exam: Exam): Promise<void> {
  await runTx(STORES.exams, 'readwrite', (s) => s.put(exam));
}

export async function deleteExamById(examId: string): Promise<void> {
  await runTx(STORES.exams, 'readwrite', (s) => s.delete(examId));
  const results = await runTx<GradingResult[]>(STORES.results, 'readonly', (s) => s.getAll());
  await Promise.all(
    results.filter((r) => r.examId === examId).map((r) => deleteResultById(r.id))
  );
  const sessions = await runTx<ScanSession[]>(STORES.sessions, 'readonly', (s) => s.getAll());
  await Promise.all(
    sessions.filter((s) => s.examId === examId).map((s) => deleteSessionById(s.id))
  );
}

export async function saveStudent(student: Student): Promise<void> {
  await runTx(STORES.students, 'readwrite', (s) => s.put(student));
}

export async function deleteStudentById(studentId: string): Promise<void> {
  await runTx(STORES.students, 'readwrite', (s) => s.delete(studentId));
}

export async function saveResult(result: GradingResult): Promise<void> {
  await runTx(STORES.results, 'readwrite', (s) => s.put(result));
}

export async function deleteResultById(resultId: string): Promise<void> {
  await runTx(STORES.results, 'readwrite', (s) => s.delete(resultId));
}

export async function saveSession(session: ScanSession): Promise<void> {
  await runTx(STORES.sessions, 'readwrite', (s) => s.put(session));
}

export async function deleteSessionById(sessionId: string): Promise<void> {
  await runTx(STORES.sessions, 'readwrite', (s) => s.delete(sessionId));
}

export async function clearAllSessionsAndActivities(): Promise<void> {
  await runTx(STORES.sessions, 'readwrite', (s) => s.clear());
  await runTx(STORES.activities, 'readwrite', (s) => s.clear());
}

export async function addActivity(activity: ActivityLog): Promise<void> {
  await runTx(STORES.activities, 'readwrite', (s) => s.put(activity));
}

export async function exportDatabaseBackup(): Promise<DatabaseBackup> {
  const data = await loadInitialDatabase();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  };
}

export async function restoreDatabaseBackup(backup: DatabaseBackup): Promise<void> {
  if (!backup || !backup.settings || !Array.isArray(backup.exams)) {
    throw new Error('Format file cadangan JSON tidak valid.');
  }

  const db = await openDatabase();
  const storeNames = Object.values(STORES);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    for (const name of storeNames) {
      tx.objectStore(name).clear();
    }
    tx.objectStore(STORES.settings).put({ ...backup.settings, id: 'main' });
    for (const exam of backup.exams) tx.objectStore(STORES.exams).put(exam);
    for (const student of backup.students || []) tx.objectStore(STORES.students).put(student);
    for (const res of backup.results || []) tx.objectStore(STORES.results).put(res);
    for (const sess of backup.sessions || []) tx.objectStore(STORES.sessions).put(sess);
    for (const act of backup.activities || []) tx.objectStore(STORES.activities).put(act);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Gagal memulihkan database.'));
  });
}
