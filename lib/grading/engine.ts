import type {
  AnswerLetter,
  Exam,
  ExamAnalytics,
  GradingResult,
  QuestionAnswerDetail,
  QuestionItemAnalysis,
} from '@/lib/types';

const ALL_LETTERS: AnswerLetter[] = ['A', 'B', 'C', 'D', 'E'];

export function getActiveLetters(optionCount: 4 | 5): AnswerLetter[] {
  return optionCount === 4 ? ALL_LETTERS.slice(0, 4) : ALL_LETTERS;
}

export function evaluateAnswers(
  exam: Exam,
  answers: QuestionAnswerDetail[]
): {
  correctCount: number;
  wrongCount: number;
  emptyCount: number;
  doubleCount: number;
  totalQuestions: number;
  score: number;
  accuracyPercent: number;
} {
  const totalQuestions = exam.questionCount;
  const answerMap = new Map<number, QuestionAnswerDetail>();
  for (const ans of answers) {
    answerMap.set(ans.questionNumber, ans);
  }

  let correctCount = 0;
  let wrongCount = 0;
  let emptyCount = 0;
  let doubleCount = 0;

  for (let q = 1; q <= totalQuestions; q++) {
    const entry = answerMap.get(q);
    const key = exam.answerKey[q];
    if (!entry || entry.selected === '' || entry.status === 'empty') {
      emptyCount++;
    } else if (entry.selected === 'DOUBLE' || entry.status === 'double') {
      doubleCount++;
      wrongCount++;
    } else if (key && entry.selected === key) {
      correctCount++;
    } else {
      wrongCount++;
    }
  }

  let rawScore = 0;
  if (exam.scoring.mode === 'weighted') {
    const maxPossible = totalQuestions * Math.max(exam.scoring.correctPoints, 0.01);
    const earned =
      correctCount * exam.scoring.correctPoints +
      wrongCount * exam.scoring.wrongPoints +
      emptyCount * exam.scoring.emptyPoints;
    rawScore = maxPossible > 0 ? Math.max(0, (earned / maxPossible) * 100) : 0;
  } else {
    rawScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  }

  const score = Math.round(rawScore * 10) / 10;
  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0;

  return {
    correctCount,
    wrongCount,
    emptyCount,
    doubleCount,
    totalQuestions,
    score,
    accuracyPercent,
  };
}

export function recalculateResultForExam(exam: Exam, result: GradingResult): GradingResult {
  const metrics = evaluateAnswers(exam, result.answers);
  return {
    ...result,
    ...metrics,
    updatedAt: new Date().toISOString(),
  };
}

export function computeExamAnalytics(exam: Exam | null, results: GradingResult[]): ExamAnalytics {
  if (!exam || results.length === 0) {
    return {
      studentCount: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      rankings: [],
      itemAnalysis: [],
      hardestQuestions: [],
    };
  }

  const evaluated = results.map((r) => recalculateResultForExam(exam, r));
  const sorted = [...evaluated].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return a.studentName.localeCompare(b.studentName, 'id');
  });

  const rankings = sorted.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  const scores = rankings.map((r) => r.score);
  const sum = scores.reduce((acc, s) => acc + s, 0);
  const averageScore = Math.round((sum / scores.length) * 10) / 10;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);

  const itemAnalysis: QuestionItemAnalysis[] = [];
  for (let q = 1; q <= exam.questionCount; q++) {
    const key = exam.answerKey[q] || '';
    const distribution: Record<AnswerLetter, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    let correctCount = 0;
    let wrongCount = 0;
    let emptyCount = 0;

    for (const studentRes of evaluated) {
      const ans = studentRes.answers.find((a) => a.questionNumber === q);
      if (!ans || ans.selected === '' || ans.status === 'empty') {
        emptyCount++;
      } else if (ans.selected === 'DOUBLE' || ans.status === 'double') {
        wrongCount++;
      } else {
        if (ans.selected in distribution) {
          distribution[ans.selected as AnswerLetter]++;
        }
        if (key && ans.selected === key) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    }

    const total = evaluated.length;
    const correctPercent = total > 0 ? Math.round((correctCount / total) * 1000) / 10 : 0;
    const difficulty: 'Mudah' | 'Sedang' | 'Sulit' =
      correctPercent >= 70 ? 'Mudah' : correctPercent >= 40 ? 'Sedang' : 'Sulit';

    itemAnalysis.push({
      questionNumber: q,
      correctAnswer: key,
      totalAnswered: total - emptyCount,
      correctCount,
      wrongCount,
      emptyCount,
      correctPercent,
      distribution,
      difficulty,
    });
  }

  const hardestQuestions = [...itemAnalysis]
    .sort((a, b) => a.correctPercent - b.correctPercent || a.questionNumber - b.questionNumber)
    .slice(0, 5);

  return {
    studentCount: evaluated.length,
    averageScore,
    highestScore,
    lowestScore,
    rankings,
    itemAnalysis,
    hardestQuestions,
  };
}

export function formatIndonesianNumber(value: number, decimals = 1): string {
  const isWhole = Math.abs(value - Math.round(value)) < 0.001;
  return isWhole
    ? String(Math.round(value))
    : value.toFixed(decimals).replace('.', ',');
}
