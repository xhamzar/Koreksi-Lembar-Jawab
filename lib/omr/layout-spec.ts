import type { OptionCount, QuestionCount } from '@/lib/types';

/**
 * Canonical normalized LJK geometry matching the 2-column reference LJK layout
 * with 4 black corner fiducial squares.
 *
 * Canonical warped image size: 700 x 1000 px.
 * The 4 black corner fiducial markers sit at exact known outer centers, and
 * when warped to the fiducial bounding box [0..1] x [0..1], every bubble center
 * maps deterministically to these exact coordinates.
 */
export const CANONICAL_WIDTH = 700;
export const CANONICAL_HEIGHT = 1000;

export interface BubbleGeometry {
  questionNumber: number;
  columnIndex: 0 | 1;
  rowIndex: number;
  optionIndex: number;
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  /** Normalized center X (0..1) inside the fiducial-bounded warped sheet */
  nx: number;
  /** Normalized center Y (0..1) inside the fiducial-bounded warped sheet */
  ny: number;
  /** Normalized radius relative to canonical width */
  nr: number;
}

const LETTERS: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];

/**
 * Fiducial square centers in canonical page coordinates (0..1 of full A4 sheet).
 */
export const FIDUCIAL_MARGIN_X = 0.055;
export const FIDUCIAL_MARGIN_Y = 0.04;
export const FIDUCIAL_SIZE_X = 0.045;
export const FIDUCIAL_SIZE_Y = 0.032;

/**
 * Compute bubble layout inside the fiducial-warped normalized sheet [0..1] x [0..1].
 * Matches the reference LJK layout:
 * - Upper ~34.5% of fiducial box: school header, student identity fields, shading instructions
 * - Lower ~63% of fiducial box: 2 columns of 20 (for 40Q) or 25 (for 50Q) rows, options A–D or A–E
 */
export function getBubbleGridLayout(
  questionCount: QuestionCount,
  optionCount: OptionCount
): BubbleGeometry[] {
  const rowsPerCol = questionCount / 2; // 20 or 25
  const gridTop = 0.365;
  const gridBottom = 0.968;
  const rowStep = (gridBottom - gridTop) / rowsPerCol;

  // Column 0 (Q1..25) and Column 1 (Q26..50) horizontal spans for the bubbles (after the question number)
  const colStarts = [0.145, 0.605];
  const colOptionSpan = optionCount === 5 ? 0.31 : 0.255;
  const optionStep = colOptionSpan / (optionCount - 1);
  const bubbleRadiusNorm = questionCount === 50 ? 0.0172 : 0.0195;

  const bubbles: BubbleGeometry[] = [];

  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < rowsPerCol; row++) {
      const qNum = col * rowsPerCol + row + 1;
      const ny = gridTop + (row + 0.5) * rowStep;

      for (let opt = 0; opt < optionCount; opt++) {
        const nx = colStarts[col] + opt * optionStep;
        bubbles.push({
          questionNumber: qNum,
          columnIndex: col as 0 | 1,
          rowIndex: row,
          optionIndex: opt,
          letter: LETTERS[opt],
          nx,
          ny,
          nr: bubbleRadiusNorm,
        });
      }
    }
  }

  return bubbles;
}
