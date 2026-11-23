'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  FlipHorizontal2,
  ImagePlus,
  Loader2,
  RefreshCw,
  Save,
  ScanLine,
  SlidersHorizontal,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppContext';
import type {
  AnswerLetter,
  AnswerValue,
  DetectedSheetPreview,
  GradingResult,
  QuestionAnswerDetail,
  ScanSession,
  SheetQuad,
} from '@/lib/types';
import {
  createThumbnailDataUrl,
  detectSheetQuadsInWorker,
  loadImageToCanvas,
  processSheetsInWorker,
} from '@/lib/omr/worker-client';
import { evaluateAnswers, formatIndonesianNumber, getActiveLetters } from '@/lib/grading/engine';
import { generateId } from '@/lib/storage/db';
import { CornerCalibrator } from '@/components/scanner/CornerCalibrator';
import { ScoreRing } from '@/components/ui/AppOverlays';

type ScannerStage = 'capture' | 'calibrate' | 'review';

interface EditableSheetState {
  preview: DetectedSheetPreview;
  questions: QuestionAnswerDetail[];
  selectedStudentId: string;
  studentName: string;
  participantNumber: string;
  className: string;
}

export function ScannerView() {
  const {
    activeExam,
    students,
    saveScannedResults,
    setActiveTab,
    pushToast,
  } = useApp();

  const [stage, setStage] = useState<ScannerStage>('capture');
  const [sourceType, setSourceType] = useState<'camera' | 'upload'>('upload');

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Source image & calibration state
  const rawImageRef = useRef<HTMLImageElement | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [cropMargin, setCropMargin] = useState(0);
  const [calibratedPreviewUrl, setCalibratedPreviewUrl] = useState('');
  const [quads, setQuads] = useState<SheetQuad[]>([]);

  // Worker progress state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [lastTotalMs, setLastTotalMs] = useState(0);

  // Review & manual override state (1..3 sheets)
  const [editableSheets, setEditableSheets] = useState<EditableSheetState[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [focusedQuestion, setFocusedQuestion] = useState<number | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      stopCamera();
      setCameraError(null);
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          'Kamera tidak didukung di peramban ini. Gunakan tombol Unggah Foto dari galeri.'
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        streamRef.current = stream;
        setCameraActive(true);
        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => undefined);
          }
        });
      } catch {
        setCameraError(
          'Izin kamera ditolak atau kamera tidak tersedia. Anda tetap dapat mengunggah foto LJK dari galeri.'
        );
      }
    },
    [facingMode, stopCamera]
  );

  const rebuildWorkingCanvas = useCallback(
    (img: HTMLImageElement, rot: number, margin: number): HTMLCanvasElement => {
      const cropRect =
        margin > 0
          ? { x: margin, y: margin, w: 1 - margin * 2, h: 1 - margin * 2 }
          : undefined;
      const canvas = loadImageToCanvas(img, rot, cropRect);
      workingCanvasRef.current = canvas;
      setCalibratedPreviewUrl(canvas.toDataURL('image/jpeg', 0.86));
      return canvas;
    },
    []
  );

  const runQuadDetection = useCallback(
    async (canvas: HTMLCanvasElement) => {
      setIsProcessing(true);
      setProgressPercent(15);
      setProgressLabel('Mendeteksi posisi 1–3 lembar LJK...');
      try {
        const detected = await detectSheetQuadsInWorker(canvas, (ev) => {
          setProgressPercent(ev.percent);
          setProgressLabel(ev.label);
        });
        setQuads(detected);
        pushToast({
          type: 'info',
          title: `${detected.length} lembar LJK terdeteksi`,
          description: 'Periksa posisi 4 sudut atau langsung pindai.',
        });
      } catch (err) {
        pushToast({
          type: 'error',
          title: 'Deteksi sudut otomatis gagal',
          description: err instanceof Error ? err.message : 'Sesuaikan sudut secara manual.',
        });
      } finally {
        setIsProcessing(false);
        setProgressPercent(0);
      }
    },
    [pushToast]
  );

  const ingestImageSource = useCallback(
    async (dataUrl: string, origin: 'camera' | 'upload') => {
      setSourceType(origin);
      setRotationDeg(0);
      setCropMargin(0);
      const img = new Image();
      img.onload = async () => {
        rawImageRef.current = img;
        const canvas = rebuildWorkingCanvas(img, 0, 0);
        setStage('calibrate');
        await runQuadDetection(canvas);
      };
      img.onerror = () => {
        pushToast({ type: 'error', title: 'Gagal membaca berkas gambar' });
      };
      img.src = dataUrl;
    },
    [pushToast, rebuildWorkingCanvas, runQuadDetection]
  );

  const handleCapturePhoto = () => {
    if (!videoRef.current || !videoRef.current.videoWidth) return;
    const snap = loadImageToCanvas(videoRef.current, 0);
    const dataUrl = snap.toDataURL('image/jpeg', 0.92);
    stopCamera();
    ingestImageSource(dataUrl, 'camera');
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      pushToast({
        type: 'warning',
        title: 'Format tidak didukung',
        description: 'Gunakan foto JPG, JPEG, atau PNG.',
      });
      return;
    }
    stopCamera();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        ingestImageSource(reader.result, 'upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRotate = (delta: number) => {
    if (!rawImageRef.current) return;
    const nextRot = ((rotationDeg + delta) % 360 + 360) % 360;
    setRotationDeg(nextRot);
    const canvas = rebuildWorkingCanvas(rawImageRef.current, nextRot, cropMargin);
    runQuadDetection(canvas);
  };

  const handleCropChange = (margin: number) => {
    setCropMargin(margin);
    if (!rawImageRef.current) return;
    rebuildWorkingCanvas(rawImageRef.current, rotationDeg, margin);
  };

  const handleRunOmrScan = async () => {
    if (!activeExam || !workingCanvasRef.current) return;
    setIsProcessing(true);
    setProgressPercent(10);
    setProgressLabel('Menyiapkan pemindaian OMR di Web Worker...');
    try {
      const { sheets, totalProcessingMs } = await processSheetsInWorker({
        imageCanvas: workingCanvasRef.current,
        questionCount: activeExam.questionCount,
        optionCount: activeExam.optionCount,
        manualQuads: quads.length > 0 ? quads : undefined,
        onProgress: (ev) => {
          setProgressPercent(ev.percent);
          setProgressLabel(ev.label);
        },
      });

      setLastTotalMs(totalProcessingMs);
      const nextEditable: EditableSheetState[] = sheets.map((s, idx) => ({
        preview: s,
        questions: s.questions,
        selectedStudentId: '',
        studentName: '',
        participantNumber: '',
        className: activeExam.className,
      }));
      setEditableSheets(nextEditable);
      setActiveSheetIdx(0);
      setFocusedQuestion(null);
      setStage('review');
      pushToast({
        type: 'success',
        title: `${sheets.length} lembar berhasil dipindai (${totalProcessingMs} ms)`,
        description: 'Periksa hasil deteksi dan pilih nama siswa sebelum menyimpan.',
      });
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Pemindaian LJK gagal',
        description: err instanceof Error ? err.message : 'Coba ulangi pemotretan.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentSheet = editableSheets[activeSheetIdx] || null;
  const activeLetters = useMemo(
    () => getActiveLetters(activeExam?.optionCount || 5),
    [activeExam?.optionCount]
  );

  const currentEvaluation = useMemo(() => {
    if (!activeExam || !currentSheet) return null;
    return evaluateAnswers(activeExam, currentSheet.questions);
  }, [activeExam, currentSheet]);

  const flaggedQuestions = useMemo(() => {
    if (!currentSheet) return { uncertain: [] as number[], double: [] as number[] };
    const uncertain: number[] = [];
    const double: number[] = [];
    for (const q of currentSheet.questions) {
      if (q.status === 'uncertain') uncertain.push(q.questionNumber);
      if (q.status === 'double') double.push(q.questionNumber);
    }
    return { uncertain, double };
  }, [currentSheet]);

  const handleManualOverride = (questionNumber: number, choice: AnswerValue) => {
    setEditableSheets((prev) =>
      prev.map((sheet, idx) => {
        if (idx !== activeSheetIdx) return sheet;
        const nextQuestions = sheet.questions.map((q) => {
          if (q.questionNumber !== questionNumber) return q;
          return {
            ...q,
            selected: choice,
            status: choice === '' ? ('empty' as const) : ('manual' as const),
            confidence: 1,
          };
        });
        return { ...sheet, questions: nextQuestions };
      })
    );
  };

  const handleSelectRosterStudent = (studentId: string) => {
    const found = students.find((s) => s.id === studentId);
    setEditableSheets((prev) =>
      prev.map((sheet, idx) => {
        if (idx !== activeSheetIdx) return sheet;
        if (!found) {
          return { ...sheet, selectedStudentId: '' };
        }
        return {
          ...sheet,
          selectedStudentId: found.id,
          studentName: found.name,
          participantNumber: found.participantNumber,
          className: found.className || activeExam?.className || '',
        };
      })
    );
  };

  const handleUpdateSheetIdentity = (
    field: 'studentName' | 'participantNumber' | 'className',
    value: string
  ) => {
    setEditableSheets((prev) =>
      prev.map((sheet, idx) =>
        idx === activeSheetIdx ? { ...sheet, [field]: value } : sheet
      )
    );
  };

  const handleSaveAllSheets = async () => {
    if (!activeExam || editableSheets.length === 0) return;

    // Validate all sheets have student names (auto-fallback prompt check)
    const missingIdx = editableSheets.findIndex((s) => !s.studentName.trim());
    if (missingIdx !== -1) {
      setActiveSheetIdx(missingIdx);
      pushToast({
        type: 'warning',
        title: `Nama siswa pada Lembar ${missingIdx + 1} belum diisi`,
        description: 'Pilih siswa dari daftar kelas atau ketik cepat nama siswa.',
      });
      return;
    }

    setSavingAll(true);
    try {
      const now = new Date().toISOString();
      const newResults: GradingResult[] = [];

      for (const sheet of editableSheets) {
        const metrics = evaluateAnswers(activeExam, sheet.questions);
        const thumb = await createThumbnailDataUrl(sheet.preview.warpedImageDataUrl, 220);
        newResults.push({
          id: generateId('res'),
          examId: activeExam.id,
          studentId: sheet.selectedStudentId || undefined,
          studentName: sheet.studentName.trim(),
          participantNumber: sheet.participantNumber.trim(),
          className: sheet.className.trim() || activeExam.className,
          answers: sheet.questions.map((q) => ({
            questionNumber: q.questionNumber,
            selected: q.selected,
            status: q.status,
            confidence: q.confidence,
            fillRatios: q.fillRatios,
          })),
          ...metrics,
          thumbnailDataUrl: thumb,
          scannedAt: now,
          updatedAt: now,
        });
      }

      const sessionThumb = newResults[0]?.thumbnailDataUrl;
      const session: ScanSession = {
        id: generateId('sess'),
        examId: activeExam.id,
        examLabel: `${activeExam.examType} · ${activeExam.subject}`,
        className: activeExam.className,
        source: sourceType,
        sheetCount: newResults.length,
        resultIds: newResults.map((r) => r.id),
        processingMs: lastTotalMs,
        engineUsed: editableSheets[0]?.preview.engineUsed || 'pixel-native',
        thumbnailDataUrl: sessionThumb,
        createdAt: now,
      };

      await saveScannedResults(newResults, session);
      setStage('capture');
      setEditableSheets([]);
      setActiveTab('results');
    } finally {
      setSavingAll(false);
    }
  };

  if (!activeExam) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-[#131D2E]">
        <p className="text-base font-bold text-slate-900 dark:text-white">
          Belum ada ujian aktif
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Buat ujian dan isi kunci jawaban terlebih dahulu di menu Pengaturan.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="mt-5 min-h-[46px] rounded-2xl bg-[#1273AA] px-6 text-sm font-bold text-white"
        >
          Buka Pengaturan
        </button>
      </div>
    );
  }

  const keyCount = Object.keys(activeExam.answerKey).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-balance text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Pindai LJK
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {activeExam.examType} · {activeExam.subject} · {activeExam.className} ·{' '}
            {activeExam.questionCount} soal ({keyCount} kunci terisi)
          </p>
        </div>

        {stage !== 'capture' && (
          <button
            type="button"
            onClick={() => {
              setStage('capture');
              setEditableSheets([]);
            }}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Pindai Ulang
          </button>
        )}
      </div>

      {/* Warning if Answer Key is Empty */}
      {keyCount === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Kunci jawaban ujian ini masih kosong. Isi kunci agar nilai terhitung akurat.</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="min-h-[38px] rounded-xl bg-amber-600 px-3.5 text-xs font-bold text-white hover:bg-amber-700"
          >
            Atur Kunci
          </button>
        </div>
      )}

      {/* Worker Processing Progress Bar */}
      {isProcessing && (
        <div className="rounded-3xl border border-sky-200 bg-white p-5 shadow-sm dark:border-sky-900 dark:bg-[#131D2E]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-5 w-5 animate-spin text-[#1273AA] dark:text-sky-400" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {progressLabel || 'Memproses gambar...'}
              </span>
            </div>
            <span className="font-mono-num text-sm font-bold text-[#1273AA] dark:text-sky-400">
              {progressPercent}%
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-[#1273AA] transition-all duration-200"
              style={{ width: `${Math.max(8, progressPercent)}%` }}
            />
          </div>
        </div>
      )}

      {/* STAGE 1: CAMERA & UPLOAD */}
      {stage === 'capture' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Camera Viewfinder */}
          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] sm:p-5 lg:col-span-7">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#0B1320] sm:aspect-[4/3]">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                  {/* Camera Alignment Frame Guide */}
                  <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-dashed border-sky-300/70">
                    <span className="absolute -left-0.5 -top-0.5 h-6 w-6 border-l-4 border-t-4 border-[#68C9F2]" />
                    <span className="absolute -right-0.5 -top-0.5 h-6 w-6 border-r-4 border-t-4 border-[#68C9F2]" />
                    <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 border-b-4 border-l-4 border-[#68C9F2]" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 border-b-4 border-r-4 border-[#68C9F2]" />
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-950/75 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                      Posisikan 1–3 lembar LJK datar & pastikan 4 kotak sudut terlihat
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-300">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-[#68C9F2]">
                    <ScanLine className="h-8 w-8" />
                  </div>
                  <h2 className="mt-4 text-base font-bold text-white">
                    Kamera Pemindai LJK Siap
                  </h2>
                  <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-400">
                    Ambil foto langsung dengan kamera HP atau unggah foto lembar jawaban (JPG/PNG). Mendukung hingga 3 lembar dalam satu foto.
                  </p>
                  {cameraError && (
                    <p className="mt-3 max-w-sm rounded-xl bg-rose-500/20 px-3 py-2 text-xs text-rose-200">
                      {cameraError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Camera & Upload Action Controls */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1273AA] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0E5E8C]"
                >
                  <Camera className="h-5 w-5" />
                  Buka Kamera
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <Camera className="h-5 w-5" />
                    Ambil Foto LJK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMode = facingMode === 'environment' ? 'user' : 'environment';
                      setFacingMode(nextMode);
                      startCamera(nextMode);
                    }}
                    aria-label="Ganti kamera depan atau belakang"
                    className="flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <FlipHorizontal2 className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="min-h-[50px] rounded-2xl border border-slate-200 px-4 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    Tutup
                  </button>
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleUploadFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#E9F3FA] px-5 text-sm font-bold text-[#1273AA] transition hover:bg-[#D9ECF8] dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/60"
              >
                <ImagePlus className="h-5 w-5" />
                Unggah Foto
              </button>
            </div>
          </div>

          {/* Camera Framing & Accuracy Guide */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Panduan Pemindaian Akurat
              </h3>
              <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E9F3FA] text-[11px] font-bold text-[#1273AA] dark:bg-sky-950 dark:text-sky-300">
                    1
                  </span>
                  <span>
                    Letakkan 1 hingga 3 lembar LJK di permukaan datar dan cukup cahaya (hindari bayangan tajam).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E9F3FA] text-[11px] font-bold text-[#1273AA] dark:bg-sky-950 dark:text-sky-300">
                    2
                  </span>
                  <span>
                    Pastikan 4 kotak hitam penanda sudut pada setiap lembar masuk ke dalam bingkai foto.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E9F3FA] text-[11px] font-bold text-[#1273AA] dark:bg-sky-950 dark:text-sky-300">
                    3
                  </span>
                  <span>
                    Sistem memisahkan tiap lembar secara independen, meluruskan perspektif, dan menganalisis rasio piksel tiap bulatan secara lokal.
                  </span>
                </li>
              </ul>
            </div>

            {/* Detection Indicator Legend */}
            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Indikator Visual Deteksi
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Hijau · Terdeteksi</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>Merah · Ganda</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Kuning · Cek Ulang</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-2.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Abu-abu · Kosong</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: ROTATE, CROP & 4-CORNER CALIBRATION */}
      {stage === 'calibrate' && calibratedPreviewUrl && (
        <CornerCalibrator
          previewDataUrl={calibratedPreviewUrl}
          quads={quads}
          onQuadsChange={setQuads}
          onRotate={handleRotate}
          cropMargin={cropMargin}
          onCropMarginChange={handleCropChange}
          onAutoDetectQuads={() => {
            if (workingCanvasRef.current) runQuadDetection(workingCanvasRef.current);
          }}
          onRunOmr={handleRunOmrScan}
          onCancel={() => setStage('capture')}
          isBusy={isProcessing}
        />
      )}

      {/* STAGE 3: VISUAL INSPECTION, MANUAL CORRECTION & SAVE (1-3 SHEETS) */}
      {stage === 'review' && currentSheet && currentEvaluation && (
        <div className="space-y-4">
          {/* Multi-Sheet Selector Tabs */}
          {editableSheets.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              {editableSheets.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveSheetIdx(idx);
                    setFocusedQuestion(null);
                  }}
                  className={`min-h-[44px] rounded-2xl px-4 text-xs font-bold transition ${
                    idx === activeSheetIdx
                      ? 'bg-[#1273AA] text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-[#131D2E] dark:text-slate-300'
                  }`}
                >
                  Lembar {idx + 1}
                  {s.studentName ? ` · ${s.studentName}` : ''}
                </button>
              ))}
            </div>
          )}

          {/* Flagged Check Banner matching reference ("Cek: 26") */}
          {(flaggedQuestions.uncertain.length > 0 || flaggedQuestions.double.length > 0) && (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-[#FEF6DB] px-4 py-2.5 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              {flaggedQuestions.uncertain.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Cek:</span>
                  {flaggedQuestions.uncertain.slice(0, 12).map((qNum) => (
                    <button
                      key={`u_${qNum}`}
                      type="button"
                      onClick={() => setFocusedQuestion(qNum)}
                      className="font-mono-num rounded-lg bg-amber-200/80 px-2 py-0.5 text-amber-950 hover:bg-amber-300 dark:bg-amber-900 dark:text-amber-100"
                    >
                      {qNum}
                    </button>
                  ))}
                </div>
              )}
              {flaggedQuestions.double.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>Ganda:</span>
                  {flaggedQuestions.double.slice(0, 12).map((qNum) => (
                    <button
                      key={`d_${qNum}`}
                      type="button"
                      onClick={() => setFocusedQuestion(qNum)}
                      className="font-mono-num rounded-lg bg-rose-200/80 px-2 py-0.5 text-rose-950 hover:bg-rose-300 dark:bg-rose-900 dark:text-rose-100"
                    >
                      {qNum}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Left: Warped Sheet Image + Interactive Bubble Ring Overlay */}
            <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#131D2E] lg:col-span-6">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hasil Deteksi Lembar {activeSheetIdx + 1} · Ketuk bulatan untuk koreksi manual
                </p>
                <button
                  type="button"
                  onClick={() => setStage('calibrate')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1273AA] hover:underline dark:text-sky-400"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Kalibrasi Sudut
                </button>
              </div>

              <div className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentSheet.preview.warpedImageDataUrl}
                  alt={`Lembar LJK ${activeSheetIdx + 1}`}
                  referrerPolicy="no-referrer"
                  className="block w-full"
                />

                {/* Interactive SVG Bubble Overlay matching reference screenshot */}
                <svg
                  viewBox="0 0 700 1000"
                  className="absolute inset-0 h-full w-full"
                >
                  {currentSheet.questions.map((q) => {
                    if (!q.bubbleCoords) return null;
                    const isFocused = focusedQuestion === q.questionNumber;

                    return q.bubbleCoords.map((bc) => {
                      const cx = bc.cx * 700;
                      const cy = bc.cy * 1000;
                      const r = bc.radius * 700;
                      const isSelected = q.selected === bc.letter;
                      const isDoubleHigh = q.status === 'double' && bc.fillRatio >= 0.25;

                      let stroke = 'transparent';
                      let fill = 'transparent';
                      let strokeWidth = 0;

                      if (q.status === 'double' && isDoubleHigh) {
                        stroke = '#DC2626';
                        fill = 'rgba(220, 38, 38, 0.22)';
                        strokeWidth = 3.5;
                      } else if (q.status === 'uncertain' && isSelected) {
                        stroke = '#D97706';
                        fill = 'rgba(217, 119, 6, 0.24)';
                        strokeWidth = 3.5;
                      } else if ((q.status === 'confident' || q.status === 'manual') && isSelected) {
                        stroke = '#16A34A';
                        fill = 'rgba(22, 163, 74, 0.24)';
                        strokeWidth = 3.5;
                      } else if (isFocused) {
                        stroke = '#0EA5E9';
                        strokeWidth = 2;
                      }

                      return (
                        <circle
                          key={`${q.questionNumber}_${bc.letter}`}
                          cx={cx}
                          cy={cy}
                          r={r * 1.15}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                          className="cursor-pointer transition-opacity hover:stroke-[#1273AA] hover:stroke-[2.5]"
                          onClick={() => {
                            const nextVal: AnswerValue =
                              q.selected === bc.letter ? '' : (bc.letter as AnswerLetter);
                            handleManualOverride(q.questionNumber, nextVal);
                            setFocusedQuestion(q.questionNumber);
                          }}
                        />
                      );
                    });
                  })}
                </svg>
              </div>
            </div>

            {/* Right: Student Identity, Live Score & Manual Correction Grid */}
            <div className="space-y-4 lg:col-span-6">
              {/* Student Identity & Live Preview Score Card */}
              <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-[#1273AA] dark:text-sky-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Identitas Siswa · Lembar {activeSheetIdx + 1}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {currentEvaluation.correctCount} benar · {currentEvaluation.wrongCount} salah ·{' '}
                      {currentEvaluation.emptyCount} kosong
                    </p>
                  </div>
                  <ScoreRing score={currentEvaluation.score} size={58} />
                </div>

                {/* Pick from Roster OR Quick Type */}
                <div className="mt-4 space-y-2.5">
                  {students.length > 0 && (
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Pilih cepat dari daftar siswa kelas
                      </label>
                      <select
                        value={currentSheet.selectedStudentId}
                        onChange={(e) => handleSelectRosterStudent(e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#1273AA] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="">— Ketik manual atau pilih siswa —</option>
                        {students.map((stu) => (
                          <option key={stu.id} value={stu.id}>
                            {stu.name} {stu.participantNumber ? `(${stu.participantNumber})` : ''} · {stu.className}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Nama siswa *
                      </label>
                      <input
                        type="text"
                        value={currentSheet.studentName}
                        onChange={(e) => handleUpdateSheetIdentity('studentName', e.target.value)}
                        placeholder="Ketik nama siswa"
                        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-sm font-bold text-slate-900 outline-none focus:border-[#1273AA] focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Nomor peserta
                      </label>
                      <input
                        type="text"
                        value={currentSheet.participantNumber}
                        onChange={(e) =>
                          handleUpdateSheetIdentity('participantNumber', e.target.value)
                        }
                        placeholder="Opsional"
                        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#1273AA] focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Answer Override List */}
              <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#131D2E]">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Koreksi Manual Jawaban ({activeExam.questionCount} soal)
                  </h3>
                  <span className="font-mono-num text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Nilai: {formatIndonesianNumber(currentEvaluation.score)}
                  </span>
                </div>

                <div className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
                  {currentSheet.questions.map((q) => {
                    const key = activeExam.answerKey[q.questionNumber];
                    const isHighlight = focusedQuestion === q.questionNumber;
                    const badgeStyle =
                      q.status === 'double'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : q.status === 'uncertain'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : q.status === 'empty'
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';

                    return (
                      <div
                        key={q.questionNumber}
                        className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-1.5 transition ${
                          isHighlight
                            ? 'border-[#1273AA] bg-sky-50/70 dark:border-sky-500 dark:bg-sky-950/30'
                            : 'border-slate-100 bg-[#F9FBFD] dark:border-slate-800 dark:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono-num w-6 text-xs font-bold text-slate-700 dark:text-slate-300">
                            {q.questionNumber}
                          </span>
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${badgeStyle}`}>
                            {q.status === 'double'
                              ? 'Ganda'
                              : q.status === 'uncertain'
                                ? 'Cek'
                                : q.status === 'empty'
                                  ? 'Kosong'
                                  : q.status === 'manual'
                                    ? 'Manual'
                                    : 'Yakin'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {activeLetters.map((ltr) => {
                            const selected = q.selected === ltr;
                            return (
                              <button
                                key={ltr}
                                type="button"
                                onClick={() =>
                                  handleManualOverride(
                                    q.questionNumber,
                                    selected ? '' : ltr
                                  )
                                }
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                                  selected
                                    ? 'bg-[#1273AA] text-white'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:border-[#1273AA] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {ltr}
                              </button>
                            );
                          })}
                          <span className="font-mono-num ml-1.5 w-8 text-right text-[11px] font-semibold text-slate-400">
                            K:{key || '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save All Button */}
              <button
                type="button"
                disabled={savingAll}
                onClick={handleSaveAllSheets}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1273AA] px-6 text-sm font-bold text-white shadow-md shadow-[#1273AA]/20 transition hover:bg-[#0E5E8C] disabled:opacity-60"
              >
                <Save className="h-5 w-5" />
                <span>
                  {savingAll
                    ? 'Menyimpan...'
                    : editableSheets.length > 1
                      ? `Simpan Semua Hasil (${editableSheets.length} Lembar)`
                      : 'Simpan Hasil Koreksi'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
