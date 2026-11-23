import type {
  DetectedSheetPreview,
  OptionCount,
  Point2D,
  QuestionAnswerDetail,
  QuestionCount,
  SheetQuad,
} from '@/lib/types';

export interface OmrProgressEvent {
  percent: number;
  label: string;
}

export interface ProcessImageOptions {
  imageCanvas: HTMLCanvasElement;
  questionCount: QuestionCount;
  optionCount: OptionCount;
  manualQuads?: SheetQuad[];
  onProgress?: (ev: OmrProgressEvent) => void;
}

let sharedWorker: Worker | null = null;
let currentEngine: 'opencv' | 'pixel-native' = 'pixel-native';

export function getOmrWorker(): Worker {
  if (typeof window === 'undefined') {
    throw new Error('OMR Worker hanya berjalan di browser.');
  }
  if (!sharedWorker) {
    sharedWorker = new Worker('/workers/omr-worker.js');
    sharedWorker.postMessage({ type: 'init' });
  }
  return sharedWorker;
}

export function getCurrentOmrEngine(): 'opencv' | 'pixel-native' {
  return currentEngine;
}

/**
 * Downscales large phone camera images (e.g. 12MP+) to max 1600px side to keep
 * memory usage safe on low-RAM Android devices while preserving sharp bubble detail.
 */
export function loadImageToCanvas(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  rotationDeg = 0,
  cropRect?: { x: number; y: number; w: number; h: number }
): HTMLCanvasElement {
  const srcW =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source instanceof HTMLImageElement
        ? source.naturalWidth
        : source.width;
  const srcH =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source instanceof HTMLImageElement
        ? source.naturalHeight
        : source.height;

  // Step 1: apply rotation
  const rotCanvas = document.createElement('canvas');
  const normRot = ((rotationDeg % 360) + 360) % 360;
  const swap = normRot === 90 || normRot === 270;
  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH, 1));
  const scaledW = Math.max(1, Math.round(srcW * scale));
  const scaledH = Math.max(1, Math.round(srcH * scale));

  rotCanvas.width = swap ? scaledH : scaledW;
  rotCanvas.height = swap ? scaledW : scaledH;
  const rCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
  if (!rCtx) throw new Error('Kanvas 2D tidak tersedia.');

  rCtx.save();
  rCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
  rCtx.rotate((normRot * Math.PI) / 180);
  rCtx.drawImage(source, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
  rCtx.restore();

  if (!cropRect) return rotCanvas;

  // Step 2: apply normalized crop
  const cx = Math.max(0, Math.round(cropRect.x * rotCanvas.width));
  const cy = Math.max(0, Math.round(cropRect.y * rotCanvas.height));
  const cw = Math.max(32, Math.min(rotCanvas.width - cx, Math.round(cropRect.w * rotCanvas.width)));
  const ch = Math.max(32, Math.min(rotCanvas.height - cy, Math.round(cropRect.h * rotCanvas.height)));

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cw;
  cropCanvas.height = ch;
  const cCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
  if (!cCtx) return rotCanvas;
  cCtx.drawImage(rotCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
  return cropCanvas;
}

function warpedBufferToDataUrl(buffer: ArrayBuffer, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const imgData = new ImageData(new Uint8ClampedArray(buffer), width, height);
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.86);
}

export function createThumbnailDataUrl(sourceDataUrl: string, maxW = 240): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => resolve('');
    img.src = sourceDataUrl;
  });
}

export async function detectSheetQuadsInWorker(
  imageCanvas: HTMLCanvasElement,
  onProgress?: (ev: OmrProgressEvent) => void
): Promise<SheetQuad[]> {
  const worker = getOmrWorker();
  const ctx = imageCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Gagal membaca piksel gambar.');

  const imgData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
  const copy = new Uint8ClampedArray(imgData.data).buffer;

  return new Promise((resolve, reject) => {
    const handleMessage = (ev: MessageEvent) => {
      const msg = ev.data;
      if (!msg) return;
      if (msg.type === 'engine_status') {
        currentEngine = msg.engine;
        return;
      }
      if (msg.type === 'progress') {
        onProgress?.({ percent: msg.percent, label: msg.label });
        return;
      }
      if (msg.type === 'quads_detected') {
        worker.removeEventListener('message', handleMessage);
        const quads: SheetQuad[] = (msg.quads as Array<[Point2D, Point2D, Point2D, Point2D]>).map(
          (corners, idx) => ({
            id: `sheet_${idx + 1}`,
            label: `Lembar ${idx + 1}`,
            corners,
          })
        );
        resolve(quads);
        return;
      }
      if (msg.type === 'error') {
        worker.removeEventListener('message', handleMessage);
        reject(new Error(msg.message));
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage(
      {
        type: 'detect_quads',
        payload: {
          width: imageCanvas.width,
          height: imageCanvas.height,
          buffer: copy,
        },
      },
      [copy]
    );
  });
}

export async function processSheetsInWorker(
  options: ProcessImageOptions
): Promise<{ sheets: DetectedSheetPreview[]; totalProcessingMs: number }> {
  const worker = getOmrWorker();
  const { imageCanvas, questionCount, optionCount, manualQuads, onProgress } = options;
  const ctx = imageCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Gagal membaca piksel kanvas.');

  const imgData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
  const copy = new Uint8ClampedArray(imgData.data).buffer;

  return new Promise((resolve, reject) => {
    const handleMessage = (ev: MessageEvent) => {
      const msg = ev.data;
      if (!msg) return;
      if (msg.type === 'engine_status') {
        currentEngine = msg.engine;
        return;
      }
      if (msg.type === 'progress') {
        onProgress?.({ percent: msg.percent, label: msg.label });
        return;
      }
      if (msg.type === 'sheets_processed') {
        worker.removeEventListener('message', handleMessage);
        const rawSheets = msg.sheets as Array<{
          sheetIndex: number;
          corners: [Point2D, Point2D, Point2D, Point2D];
          warpedWidth: number;
          warpedHeight: number;
          warpedBuffer: ArrayBuffer;
          engineUsed: 'opencv' | 'pixel-native';
          processingMs: number;
          questions: QuestionAnswerDetail[];
          uncertainQuestions: number[];
          doubleQuestions: number[];
          emptyQuestions: number[];
        }>;

        const sheets: DetectedSheetPreview[] = rawSheets.map((s) => ({
          sheetIndex: s.sheetIndex,
          quad: {
            id: `sheet_${s.sheetIndex + 1}`,
            label: `Lembar ${s.sheetIndex + 1}`,
            corners: s.corners,
          },
          warpedImageDataUrl: warpedBufferToDataUrl(s.warpedBuffer, s.warpedWidth, s.warpedHeight),
          warpedWidth: s.warpedWidth,
          warpedHeight: s.warpedHeight,
          questions: s.questions,
          uncertainQuestions: s.uncertainQuestions,
          doubleQuestions: s.doubleQuestions,
          emptyQuestions: s.emptyQuestions,
          engineUsed: s.engineUsed,
          processingMs: s.processingMs,
        }));

        resolve({
          sheets,
          totalProcessingMs: msg.totalProcessingMs,
        });
        return;
      }
      if (msg.type === 'error') {
        worker.removeEventListener('message', handleMessage);
        reject(new Error(msg.message));
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage(
      {
        type: 'process_sheets',
        payload: {
          width: imageCanvas.width,
          height: imageCanvas.height,
          buffer: copy,
          questionCount,
          optionCount,
          manualQuads: manualQuads?.map((q) => q.corners),
        },
      },
      [copy]
    );
  });
}
