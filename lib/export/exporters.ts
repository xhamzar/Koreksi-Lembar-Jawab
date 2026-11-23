import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AppSettings, Exam, ExamAnalytics, Student } from '@/lib/types';
import { formatIndonesianNumber } from '@/lib/grading/engine';
import { generateId } from '@/lib/storage/db';

export function exportResultsToExcel(
  exam: Exam,
  settings: AppSettings,
  analytics: ExamAnalytics
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Peringkat & Nilai Siswa
  const rankingRows = analytics.rankings.map((r) => ({
    Peringkat: r.rank,
    'Nama Siswa': r.studentName,
    'Nomor Peserta': r.participantNumber || '-',
    Kelas: r.className || exam.className,
    Benar: r.correctCount,
    Salah: r.wrongCount,
    Kosong: r.emptyCount,
    'Jawaban Ganda': r.doubleCount,
    'Ketepatan (%)': r.accuracyPercent,
    'Nilai Akhir': r.score,
    'Waktu Pindai': new Date(r.scannedAt).toLocaleString('id-ID'),
  }));

  const wsRanking = XLSX.utils.json_to_sheet(rankingRows);
  XLSX.utils.book_append_sheet(wb, wsRanking, 'Peringkat Siswa');

  // Sheet 2: Analisis Butir Soal
  const analysisRows = analytics.itemAnalysis.map((item) => ({
    'No. Soal': item.questionNumber,
    'Kunci Jawaban': item.correctAnswer || '-',
    'Menjawab Benar': item.correctCount,
    'Menjawab Salah': item.wrongCount,
    Kosong: item.emptyCount,
    'Persentase Benar (%)': item.correctPercent,
    'Pilih A': item.distribution.A,
    'Pilih B': item.distribution.B,
    'Pilih C': item.distribution.C,
    'Pilih D': item.distribution.D,
    ...(exam.optionCount === 5 ? { 'Pilih E': item.distribution.E } : {}),
    'Tingkat Kesukaran': item.difficulty,
  }));

  const wsAnalysis = XLSX.utils.json_to_sheet(analysisRows);
  XLSX.utils.book_append_sheet(wb, wsAnalysis, 'Analisis Soal');

  // Sheet 3: Matriks Jawaban Siswa
  const matrixRows = analytics.rankings.map((r) => {
    const row: Record<string, string | number> = {
      'Nama Siswa': r.studentName,
      'No. Peserta': r.participantNumber || '-',
      Nilai: r.score,
    };
    for (let q = 1; q <= exam.questionCount; q++) {
      const ans = r.answers.find((a) => a.questionNumber === q);
      row[`S${q}`] = ans?.selected === 'DOUBLE' ? 'GANDA' : ans?.selected || '-';
    }
    return row;
  });

  const wsMatrix = XLSX.utils.json_to_sheet(matrixRows);
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriks Jawaban');

  const safeTitle = `${settings.schoolName}_${exam.examType}_${exam.subject}_${exam.className}`
    .replace(/[^a-zA-Z0-9_-]+/g, '_');
  XLSX.writeFile(wb, `Hasil_${safeTitle}.xlsx`);
}

export function exportResultsToPdf(
  exam: Exam,
  settings: AppSettings,
  analytics: ExamAnalytics
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.schoolName.toUpperCase(), 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Laporan Hasil Koreksi LJK · ${exam.examType} · ${exam.subject} · ${exam.className}`,
    14,
    22
  );
  doc.text(
    `Semester ${exam.semester} · Tahun Ajaran ${exam.academicYear} · Jumlah Soal: ${exam.questionCount}`,
    14,
    27
  );

  // Summary KPIs
  doc.setTextColor(15, 23, 42);
  autoTable(doc, {
    startY: 32,
    head: [['Jumlah Siswa', 'Nilai Rata-rata', 'Nilai Tertinggi', 'Nilai Terendah']],
    body: [
      [
        String(analytics.studentCount),
        formatIndonesianNumber(analytics.averageScore),
        formatIndonesianNumber(analytics.highestScore),
        formatIndonesianNumber(analytics.lowestScore),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [18, 115, 170], textColor: 255, fontStyle: 'bold' },
    styles: { halign: 'center', fontSize: 10 },
  });

  const afterSummaryY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 52;

  // Student Rankings Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Daftar Peringkat & Nilai Siswa', 14, afterSummaryY + 10);

  autoTable(doc, {
    startY: afterSummaryY + 14,
    head: [['No', 'Nama Siswa', 'No. Peserta', 'Benar', 'Salah', 'Kosong', 'Nilai']],
    body: analytics.rankings.map((r) => [
      String(r.rank),
      r.studentName,
      r.participantNumber || '-',
      String(r.correctCount),
      String(r.wrongCount),
      String(r.emptyCount),
      formatIndonesianNumber(r.score),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
    },
  });

  // Hardest Questions Table on new page if needed
  const afterRankY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
  if (analytics.hardestQuestions.length > 0) {
    const startY = afterRankY > 220 ? (doc.addPage(), 18) : afterRankY + 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('5 Soal Paling Sulit', 14, startY);

    autoTable(doc, {
      startY: startY + 4,
      head: [['No. Soal', 'Kunci', 'Benar', 'Salah', 'Kosong', '% Benar', 'Kategori']],
      body: analytics.hardestQuestions.map((q) => [
        `Soal ${q.questionNumber}`,
        q.correctAnswer || '-',
        String(q.correctCount),
        String(q.wrongCount),
        String(q.emptyCount),
        `${formatIndonesianNumber(q.correctPercent)}%`,
        q.difficulty,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: 255 },
      styles: { fontSize: 9, halign: 'center' },
    });
  }

  const safeTitle = `${exam.examType}_${exam.subject}_${exam.className}`.replace(/[^a-zA-Z0-9_-]+/g, '_');
  doc.save(`Laporan_LJK_${safeTitle}.pdf`);
}

export async function parseStudentsFromSpreadsheet(
  file: File,
  defaultClassName: string
): Promise<Student[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error('File tidak memiliki lembar data.');

  const ws = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

  const now = new Date().toISOString();
  const parsed: Student[] = [];

  for (const row of rows) {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      normalized[k.trim().toLowerCase()] = String(v ?? '').trim();
    }

    const name =
      normalized['nama'] ||
      normalized['nama siswa'] ||
      normalized['nama lengkap'] ||
      normalized['name'] ||
      normalized['student'] ||
      '';

    if (!name) continue;

    const participantNumber =
      normalized['nomor peserta'] ||
      normalized['no peserta'] ||
      normalized['no. peserta'] ||
      normalized['nis'] ||
      normalized['nisn'] ||
      normalized['id'] ||
      '';

    const className =
      normalized['kelas'] || normalized['class'] || normalized['rombel'] || defaultClassName;

    parsed.push({
      id: generateId('stu'),
      name,
      participantNumber,
      className,
      createdAt: now,
    });
  }

  if (parsed.length === 0) {
    throw new Error('Tidak ditemukan kolom "Nama" atau "Nama Siswa" yang valid pada file.');
  }

  return parsed;
}
