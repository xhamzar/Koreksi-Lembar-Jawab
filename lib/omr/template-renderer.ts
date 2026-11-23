import { jsPDF } from 'jspdf';
import type { AppSettings, Exam } from '@/lib/types';
import {
  CANONICAL_HEIGHT,
  CANONICAL_WIDTH,
  FIDUCIAL_MARGIN_X,
  FIDUCIAL_MARGIN_Y,
  FIDUCIAL_SIZE_X,
  FIDUCIAL_SIZE_Y,
  getBubbleGridLayout,
} from '@/lib/omr/layout-spec';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

/**
 * Renders the exact 2-column printable LJK template with 4 black corner fiducial squares
 * onto an HTML5 Canvas. The fiducial inner box maps 1:1 to `getBubbleGridLayout()` so
 * printed or exported sheets scan with high geometric precision.
 */
export function renderLjkTemplateCanvas(
  exam: Exam,
  settings: AppSettings,
  scale = 2
): HTMLCanvasElement {
  const pageW = Math.round(CANONICAL_WIDTH * 1.14 * scale);
  const pageH = Math.round(CANONICAL_HEIGHT * 1.1 * scale);

  const canvas = document.createElement('canvas');
  canvas.width = pageW;
  canvas.height = pageH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Crisp white paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, pageW, pageH);

  // Outer fiducial anchor squares (4 black corners matching reference sheet)
  const fW = pageW * FIDUCIAL_SIZE_X;
  const fH = pageH * FIDUCIAL_SIZE_Y;
  const fLeft = pageW * FIDUCIAL_MARGIN_X;
  const fRight = pageW * (1 - FIDUCIAL_MARGIN_X) - fW;
  const fTop = pageH * FIDUCIAL_MARGIN_Y;
  const fBottom = pageH * (1 - FIDUCIAL_MARGIN_Y) - fH;

  ctx.fillStyle = '#09090B';
  ctx.fillRect(fLeft, fTop, fW, fH);
  ctx.fillRect(fRight, fTop, fW, fH);
  ctx.fillRect(fLeft, fBottom, fW, fH);
  ctx.fillRect(fRight, fBottom, fW, fH);

  // Canonical fiducial center-to-center coordinate box (exact match to OMR warp)
  const boxX = fLeft + fW / 2;
  const boxY = fTop + fH / 2;
  const boxW = fRight + fW / 2 - boxX;
  const boxH = fBottom + fH / 2 - boxY;

  const px = (nx: number) => boxX + nx * boxW;
  const py = (ny: number) => boxY + ny * boxH;

  // Header School Block
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.font = `600 ${Math.round(11 * scale)}px sans-serif`;
  ctx.fillText('DINAS PENDIDIKAN DAN KEBUDAYAAN', px(0.5), py(0.032));

  ctx.font = `800 ${Math.round(18 * scale)}px sans-serif`;
  ctx.fillText(settings.schoolName.toUpperCase(), px(0.5), py(0.062));

  ctx.font = `400 ${Math.round(9.5 * scale)}px sans-serif`;
  ctx.fillStyle = '#4B5563';
  ctx.fillText(
    settings.schoolAddress || 'Lembar Jawaban Komputer Pilihan Ganda',
    px(0.5),
    py(0.083)
  );

  // Double horizontal header rule
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(px(0.07), py(0.1));
  ctx.lineTo(px(0.93), py(0.1));
  ctx.stroke();

  ctx.lineWidth = 0.8 * scale;
  ctx.beginPath();
  ctx.moveTo(px(0.07), py(0.105));
  ctx.lineTo(px(0.93), py(0.105));
  ctx.stroke();

  // Exam title block
  ctx.fillStyle = '#111827';
  ctx.font = `700 ${Math.round(13.5 * scale)}px sans-serif`;
  ctx.fillText('LEMBAR JAWABAN', px(0.5), py(0.132));

  ctx.font = `700 ${Math.round(11 * scale)}px sans-serif`;
  ctx.fillText(
    (exam.template.headerSubtitle || `${exam.examType} · ${exam.subject}`).toUpperCase(),
    px(0.5),
    py(0.154)
  );

  ctx.font = `600 ${Math.round(10 * scale)}px sans-serif`;
  ctx.fillStyle = '#374151';
  ctx.fillText(
    `SEMESTER ${exam.semester.toUpperCase()} · TAHUN PELAJARAN ${exam.academicYear}`,
    px(0.5),
    py(0.174)
  );

  // Student Identity Lines
  const fields: Array<{ label: string; value?: string }> = [];
  if (exam.template.identityFields.showStudentName) fields.push({ label: 'Nama Siswa' });
  if (exam.template.identityFields.showSubject) {
    fields.push({ label: 'Mata Pelajaran', value: exam.subject });
  }
  if (exam.template.identityFields.showClass) {
    fields.push({ label: 'Kelas / Program', value: exam.className });
  }
  if (exam.template.identityFields.showParticipantNumber) {
    fields.push({ label: 'Nomor Peserta' });
  }

  ctx.textAlign = 'left';
  ctx.font = `500 ${Math.round(10.5 * scale)}px sans-serif`;
  const startFieldY = 0.205;
  const fieldGap = 0.025;
  fields.forEach((f, idx) => {
    const fy = py(startFieldY + idx * fieldGap);
    ctx.fillStyle = '#1F2937';
    ctx.fillText(f.label, px(0.07), fy);
    ctx.fillText(':', px(0.27), fy);
    if (f.value) {
      ctx.font = `600 ${Math.round(10.5 * scale)}px sans-serif`;
      ctx.fillText(f.value, px(0.295), fy);
      ctx.font = `500 ${Math.round(10.5 * scale)}px sans-serif`;
    }
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 0.8 * scale;
    ctx.beginPath();
    ctx.moveTo(px(0.29), fy + 2.5 * scale);
    ctx.lineTo(px(0.93), fy + 2.5 * scale);
    ctx.stroke();
  });

  // Shading Guide Bar
  const guideY = py(0.308);
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(px(0.07), guideY - 11 * scale, boxW * 0.86, 22 * scale);

  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(px(0.11), guideY, 5.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `600 ${Math.round(9 * scale)}px sans-serif`;
  ctx.fillText('BENAR (Hitamkan penuh)', px(0.13), guideY + 3.2 * scale);

  // Incorrect examples
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.arc(px(0.47), guideY, 5.5 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px(0.47) - 3.5 * scale, guideY - 3.5 * scale);
  ctx.lineTo(px(0.47) + 3.5 * scale, guideY + 3.5 * scale);
  ctx.moveTo(px(0.47) + 3.5 * scale, guideY - 3.5 * scale);
  ctx.lineTo(px(0.47) - 3.5 * scale, guideY + 3.5 * scale);
  ctx.stroke();
  ctx.fillStyle = '#4B5563';
  ctx.fillText('SALAH (Silang / Tipis / Ganda)', px(0.49), guideY + 3.2 * scale);

  // Column headers (No  A  B  C  D  E)
  const bubbles = getBubbleGridLayout(exam.questionCount, exam.optionCount);
  const activeLetters = LETTERS.slice(0, exam.optionCount);
  const headerY = py(0.35);

  ctx.fillStyle = '#111827';
  ctx.font = `700 ${Math.round(11 * scale)}px sans-serif`;
  ctx.textAlign = 'center';

  const colNoX = [0.088, 0.548];
  const colStarts = [0.145, 0.605];
  const colOptionSpan = exam.optionCount === 5 ? 0.31 : 0.255;
  const optionStep = colOptionSpan / (exam.optionCount - 1);

  for (let col = 0; col < 2; col++) {
    ctx.fillText('No', px(colNoX[col]), headerY);
    activeLetters.forEach((ltr, optIdx) => {
      ctx.fillText(ltr, px(colStarts[col] + optIdx * optionStep), headerY);
    });
  }

  // Subtle horizontal divider below column headers
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(px(0.07), py(0.359));
  ctx.lineTo(px(0.93), py(0.359));
  ctx.stroke();

  // Draw Question Numbers + Bubble Circles
  const rowsPerCol = exam.questionCount / 2;
  const drawnNumbers = new Set<number>();

  for (const b of bubbles) {
    const cx = px(b.nx);
    const cy = py(b.ny);
    const r = b.nr * boxW;

    if (!drawnNumbers.has(b.questionNumber)) {
      drawnNumbers.add(b.questionNumber);
      const qCol = b.questionNumber <= rowsPerCol ? 0 : 1;
      ctx.fillStyle = '#1F2937';
      ctx.font = `600 ${Math.round(10.5 * scale)}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(String(b.questionNumber), px(colNoX[qCol] + 0.014), cy + 3.8 * scale);
    }

    // Crisp bubble outline
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 1.3 * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Faint option letter inside circle (light gray so OMR adaptive threshold ignores it)
    ctx.fillStyle = '#9CA3AF';
    ctx.font = `500 ${Math.round(8.5 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(b.letter, cx, cy + 3 * scale);
  }

  return canvas;
}

export function downloadLjkPdf(exam: Exam, settings: AppSettings): void {
  const canvas = renderLjkTemplateCanvas(exam, settings, 2.5);
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
  const safeName = `${exam.examType}_${exam.subject}_${exam.className}_${exam.questionCount}Soal`
    .replace(/[^a-zA-Z0-9_-]+/g, '_');
  pdf.save(`LJK_${safeName}.pdf`);
}

export function downloadLjkPng(exam: Exam, settings: AppSettings): void {
  const canvas = renderLjkTemplateCanvas(exam, settings, 2.5);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `LJK_${exam.subject}_${exam.questionCount}Soal.png`.replace(/\s+/g, '_');
  link.click();
}
