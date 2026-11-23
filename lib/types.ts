export type AnswerLetter = 'A' | 'B' | 'C' | 'D' | 'E';
export type AnswerValue = AnswerLetter | '' | 'DOUBLE';

export type QuestionCount = 40 | 50;
export type OptionCount = 4 | 5;

export type BubbleDetectionStatus = 'confident' | 'uncertain' | 'double' | 'empty' | 'manual';

export interface ScoringConfig {
  mode: 'standard_percentage' | 'weighted';
  correctPoints: number;
  wrongPoints: number;
  emptyPoints: number;
}

export interface LjkIdentityFields {
  showStudentName: boolean;
  showSubject: boolean;
  showClass: boolean;
  showParticipantNumber: boolean;
}

export interface LjkTemplateConfig {
  questionCount: QuestionCount;
  optionCount: OptionCount;
  identityFields: LjkIdentityFields;
  headerSubtitle: string;
}

export interface Exam {
  id: string;
  examType: string;
  subject: string;
  className: string;
  semester: string;
  academicYear: string;
  questionCount: QuestionCount;
  optionCount: OptionCount;
  answerKey: Record<number, AnswerLetter>;
  scoring: ScoringConfig;
  template: LjkTemplateConfig;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  name: string;
  participantNumber: string;
  className: string;
  createdAt: string;
}

export interface BubbleOptionReading {
  letter: AnswerLetter;
  fillRatio: number;
  cx: number;
  cy: number;
  radius: number;
}

export interface QuestionAnswerDetail {
  questionNumber: number;
  selected: AnswerValue;
  status: BubbleDetectionStatus;
  confidence: number; // 0..1
  fillRatios?: Record<string, number>;
  bubbleCoords?: BubbleOptionReading[];
}

export interface GradingResult {
  id: string;
  examId: string;
  studentId?: string;
  studentName: string;
  participantNumber: string;
  className: string;
  answers: QuestionAnswerDetail[];
  correctCount: number;
  wrongCount: number;
  emptyCount: number;
  doubleCount: number;
  totalQuestions: number;
  score: number;
  accuracyPercent: number;
  thumbnailDataUrl?: string;
  scannedAt: string;
  updatedAt: string;
}

export interface ScanSession {
  id: string;
  examId: string;
  examLabel: string;
  className: string;
  source: 'camera' | 'upload';
  sheetCount: number;
  resultIds: string[];
  processingMs: number;
  engineUsed: 'opencv' | 'pixel-native';
  thumbnailDataUrl?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  detail: string;
  category: 'exam' | 'scan' | 'result' | 'data';
  createdAt: string;
}

export interface AppSettings {
  id: 'main';
  schoolName: string;
  schoolAddress: string;
  creatorName: string;
  customEmblemDataUrl?: string;
  theme: 'light' | 'dark';
  activeExamId: string;
  seededSampleV1?: boolean;
}

export interface Point2D {
  x: number; // normalized 0..1 relative to image width
  y: number; // normalized 0..1 relative to image height
}

export interface SheetQuad {
  id: string;
  label: string;
  corners: [Point2D, Point2D, Point2D, Point2D]; // TL, TR, BR, BL
}

export interface DetectedSheetPreview {
  sheetIndex: number;
  quad: SheetQuad;
  warpedImageDataUrl: string;
  warpedWidth: number;
  warpedHeight: number;
  questions: QuestionAnswerDetail[];
  uncertainQuestions: number[];
  doubleQuestions: number[];
  emptyQuestions: number[];
  engineUsed: 'opencv' | 'pixel-native';
  processingMs: number;
}

export interface QuestionItemAnalysis {
  questionNumber: number;
  correctAnswer: AnswerLetter | '';
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  emptyCount: number;
  correctPercent: number;
  distribution: Record<AnswerLetter, number>;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit';
}

export interface ExamAnalytics {
  studentCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  rankings: Array<GradingResult & { rank: number }>;
  itemAnalysis: QuestionItemAnalysis[];
  hardestQuestions: QuestionItemAnalysis[];
}

export interface DatabaseBackup {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  exams: Exam[];
  students: Student[];
  results: GradingResult[];
  sessions: ScanSession[];
  activities: ActivityLog[];
}

export type NavTab = 'settings' | 'scanner' | 'results' | 'history';
