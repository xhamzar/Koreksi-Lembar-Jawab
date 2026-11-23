/**
 * Dedicated Web Worker for Client-Side Optical Mark Recognition (OMR).
 * Runs off the main UI thread so mobile devices stay responsive.
 *
 * Pipeline:
 * 1. Grayscale conversion + 3x3 Gaussian blur
 * 2. Integral-image adaptive thresholding (resistant to shadows & uneven lighting)
 * 3. Independent Multi-Sheet Detection (1–3 LJK sheets via 4-corner fiducial clustering or OpenCV contours)
 * 4. 3x3 Homography Perspective Correction (OpenCV warpPerspective when ready, or native bilinear homography)
 * 5. Bubble core pixel-fill ratio & quadrant uniformity analysis (Confident / Double / Uncertain / Empty)
 */

const CANONICAL_WIDTH = 700;
const CANONICAL_HEIGHT = 1000;
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

let openCvState = 'idle'; // 'idle' | 'loading' | 'ready' | 'unavailable'

function tryLoadOpenCv() {
  if (openCvState !== 'idle') return;
  openCvState = 'loading';
  try {
    self.Module = {
      onRuntimeInitialized() {
        openCvState = 'ready';
        self.postMessage({ type: 'engine_status', engine: 'opencv' });
      },
    };
    self.importScripts('https://docs.opencv.org/4.10.0/opencv.js');
    if (self.cv && self.cv.Mat) {
      openCvState = 'ready';
      self.postMessage({ type: 'engine_status', engine: 'opencv' });
    }
  } catch {
    openCvState = 'unavailable';
    self.postMessage({ type: 'engine_status', engine: 'pixel-native' });
  }
}

function getBubbleGridLayout(questionCount, optionCount) {
  const rowsPerCol = questionCount / 2;
  const gridTop = 0.365;
  const gridBottom = 0.968;
  const rowStep = (gridBottom - gridTop) / rowsPerCol;
  const colStarts = [0.145, 0.605];
  const colOptionSpan = optionCount === 5 ? 0.31 : 0.255;
  const optionStep = colOptionSpan / (optionCount - 1);
  const bubbleRadiusNorm = questionCount === 50 ? 0.0172 : 0.0195;

  const bubbles = [];
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < rowsPerCol; row++) {
      const questionNumber = col * rowsPerCol + row + 1;
      const ny = gridTop + (row + 0.5) * rowStep;
      for (let opt = 0; opt < optionCount; opt++) {
        const nx = colStarts[col] + opt * optionStep;
        bubbles.push({
          questionNumber,
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

function rgbaToGrayscale(rgba, width, height) {
  const gray = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = (rgba[p] * 77 + rgba[p + 1] * 150 + rgba[p + 2] * 29) >> 8;
  }
  return gray;
}

function gaussianBlur3x3(gray, width, height) {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - 1) * width;
    const y1 = y * width;
    const y2 = Math.min(height - 1, y + 1) * width;
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - 1);
      const x2 = Math.min(width - 1, x + 1);
      const sum =
        gray[y0 + x0] +
        gray[y0 + x] * 2 +
        gray[y0 + x2] +
        gray[y1 + x0] * 2 +
        gray[y1 + x] * 4 +
        gray[y1 + x2] * 2 +
        gray[y2 + x0] +
        gray[y2 + x] * 2 +
        gray[y2 + x2];
      out[y1 + x] = sum >> 4;
    }
  }
  return out;
}

function buildIntegralImage(gray, width, height) {
  const integral = new Float64Array((width + 1) * (height + 1));
  const stride = width + 1;
  for (let y = 1; y <= height; y++) {
    let rowSum = 0;
    const gOffset = (y - 1) * width;
    const iOffset = y * stride;
    const prevOffset = (y - 1) * stride;
    for (let x = 1; x <= width; x++) {
      rowSum += gray[gOffset + x - 1];
      integral[iOffset + x] = integral[prevOffset + x] + rowSum;
    }
  }
  return integral;
}

function adaptiveThresholdDark(gray, width, height, radius, deltaRatio) {
  const integral = buildIntegralImage(gray, width, height);
  const stride = width + 1;
  const bin = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - radius);
    const y2 = Math.min(height - 1, y + radius);
    const r1 = y1 * stride;
    const r2 = (y2 + 1) * stride;
    const rowOff = y * width;

    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - radius);
      const x2 = Math.min(width - 1, x + radius);
      const area = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum = integral[r2 + x2 + 1] - integral[r1 + x2 + 1] - integral[r2 + x1] + integral[r1 + x1];
      const localMean = sum / area;
      // Dark pixel if significantly darker than local neighborhood
      const threshold = Math.min(localMean * (1 - deltaRatio), localMean - 14);
      bin[rowOff + x] = gray[rowOff + x] < threshold ? 1 : 0;
    }
  }
  return bin;
}

/**
 * Connected components finder for dark square fiducial markers.
 */
function findFiducialSquares(bin, width, height) {
  const visited = new Uint8Array(width * height);
  const minDim = Math.max(8, Math.floor(Math.min(width, height) * 0.014));
  const maxDim = Math.floor(Math.min(width, height) * 0.14);
  const candidates = [];
  const queue = new Int32Array(Math.min(width * height, 120000));

  for (let y = 1; y < height - 1; y += 2) {
    const rowOff = y * width;
    for (let x = 1; x < width - 1; x += 2) {
      const startIdx = rowOff + x;
      if (bin[startIdx] === 0 || visited[startIdx]) continue;

      let head = 0;
      let tail = 0;
      queue[tail++] = startIdx;
      visited[startIdx] = 1;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;
      let sumX = 0;
      let sumY = 0;
      let overflow = false;

      while (head < tail) {
        const cur = queue[head++];
        const cx = cur % width;
        const cy = (cur - cx) / width;
        count++;
        sumX += cx;
        sumY += cy;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        if (maxX - minX > maxDim || maxY - minY > maxDim || count > maxDim * maxDim) {
          overflow = true;
        }

        const nbs = [cur - 1, cur + 1, cur - width, cur + width];
        for (let k = 0; k < 4; k++) {
          const nb = nbs[k];
          if (nb >= 0 && nb < bin.length && bin[nb] === 1 && !visited[nb]) {
            visited[nb] = 1;
            if (tail < queue.length) {
              queue[tail++] = nb;
            }
          }
        }
      }

      if (overflow) continue;
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      if (bw < minDim || bh < minDim || bw > maxDim || bh > maxDim) continue;

      const aspect = bw / bh;
      if (aspect < 0.62 || aspect > 1.62) continue;

      const fillRatio = count / (bw * bh);
      if (fillRatio < 0.58) continue;

      candidates.push({
        cx: sumX / count,
        cy: sumY / count,
        bw,
        bh,
        area: count,
        fillRatio,
      });
    }
  }

  // Sort by area descending and keep top 36 candidates for multi-sheet grouping
  candidates.sort((a, b) => b.area - a.area);
  return candidates.slice(0, 36);
}

function orderQuadPoints(pts) {
  // pts: 4 items with {x, y}
  const sortedByY = [...pts].sort((a, b) => a.y - b.y);
  const top = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sortedByY.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]]; // TL, TR, BR, BL
}

function quadArea(q) {
  let s = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) * 0.5;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointInQuad(pt, q) {
  let inside = false;
  for (let i = 0, j = 3; i < 4; j = i++) {
    const xi = q[i].x, yi = q[i].y;
    const xj = q[j].x, yj = q[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Independently discovers 1 to 3 LJK sheet quads from detected fiducial markers.
 * Works regardless of sheet tilt, scale differences, or horizontal/vertical arrangement.
 */
function groupFiducialsIntoSheets(markers, width, height) {
  if (markers.length < 4) return [];

  const imgArea = width * height;
  const validQuads = [];
  const n = Math.min(markers.length, 24);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // Markers on the same sheet must have reasonably similar size (within 2.8x)
      const areaRatioIJ = Math.max(markers[i].area, markers[j].area) / Math.min(markers[i].area, markers[j].area);
      if (areaRatioIJ > 2.8) continue;

      for (let k = j + 1; k < n; k++) {
        for (let l = k + 1; l < n; l++) {
          const group = [markers[i], markers[j], markers[k], markers[l]];
          const areas = group.map((m) => m.area);
          const maxA = Math.max(...areas);
          const minA = Math.min(...areas);
          if (maxA / minA > 2.8) continue;

          const ordered = orderQuadPoints(group.map((m) => ({ x: m.cx, y: m.cy })));
          const topW = dist(ordered[0], ordered[1]);
          const botW = dist(ordered[3], ordered[2]);
          const leftH = dist(ordered[0], ordered[3]);
          const rightH = dist(ordered[1], ordered[2]);

          if (Math.min(topW, botW, leftH, rightH) < Math.min(width, height) * 0.14) continue;

          // Opposite edges should be reasonably similar (perspective tolerance)
          const wRatio = Math.max(topW, botW) / Math.min(topW, botW);
          const hRatio = Math.max(leftH, rightH) / Math.min(leftH, rightH);
          if (wRatio > 1.38 || hRatio > 1.38) continue;

          const avgW = (topW + botW) * 0.5;
          const avgH = (leftH + rightH) * 0.5;
          // LJK fiducial box is portrait (~0.52 to 0.92 width/height)
          const aspect = avgW / avgH;
          if (aspect < 0.45 || aspect > 1.05) continue;

          const area = quadArea(ordered);
          if (area < imgArea * 0.06 || area > imgArea * 0.96) continue;

          // Check diagonals cross reasonably near center (convex rectangle-like)
          const d1 = dist(ordered[0], ordered[2]);
          const d2 = dist(ordered[1], ordered[3]);
          const diagRatio = Math.max(d1, d2) / Math.min(d1, d2);
          if (diagRatio > 1.35) continue;

          // Score quad quality: closer to canonical ~0.72 aspect + symmetric diagonals + consistent marker sizes
          const aspectErr = Math.abs(aspect - 0.72);
          const score =
            (1 - Math.min(1, aspectErr * 1.5)) * 40 +
            (1 - Math.min(1, (diagRatio - 1) * 2)) * 30 +
            (1 - Math.min(1, (wRatio - 1) * 2 + (hRatio - 1) * 2)) * 20 +
            (1 - Math.min(1, (maxA / minA - 1) * 0.5)) * 10;

          validQuads.push({
            corners: ordered,
            markerIndices: [i, j, k, l],
            center: {
              x: (ordered[0].x + ordered[1].x + ordered[2].x + ordered[3].x) * 0.25,
              y: (ordered[0].y + ordered[1].y + ordered[2].y + ordered[3].y) * 0.25,
            },
            area,
            score,
          });
        }
      }
    }
  }

  validQuads.sort((a, b) => b.score - a.score);

  const selected = [];
  const usedMarkers = new Set();

  for (const cand of validQuads) {
    if (selected.length >= 3) break;
    if (cand.markerIndices.some((idx) => usedMarkers.has(idx))) continue;

    // Ensure non-overlapping with already selected sheets
    let overlaps = false;
    for (const prev of selected) {
      if (pointInQuad(cand.center, prev.corners) || pointInQuad(prev.center, cand.corners)) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    cand.markerIndices.forEach((idx) => usedMarkers.add(idx));
    selected.push(cand);
  }

  // Sort left-to-right, then top-to-bottom for intuitive Sheet 1, 2, 3 ordering
  selected.sort((a, b) => {
    if (Math.abs(a.center.x - b.center.x) > width * 0.12) {
      return a.center.x - b.center.x;
    }
    return a.center.y - b.center.y;
  });

  return selected.map((s) =>
    s.corners.map((pt) => ({
      x: Math.max(0, Math.min(1, pt.x / width)),
      y: Math.max(0, Math.min(1, pt.y / height)),
    }))
  );
}

/**
 * Fallback detector using OpenCV findContours (if ready) or bright-paper bounding region
 * when fiducial squares are not found (e.g., tightly cropped or non-fiducial sheet).
 */
function detectFallbackSheetQuads(rgba, gray, width, height) {
  if (openCvState === 'ready' && self.cv && self.cv.Mat) {
    try {
      const src = new self.cv.Mat(height, width, self.cv.CV_8UC4);
      src.data.set(rgba);
      const cvGray = new self.cv.Mat();
      const blurred = new self.cv.Mat();
      const edges = new self.cv.Mat();
      const contours = new self.cv.MatVector();
      const hierarchy = new self.cv.Mat();

      self.cv.cvtColor(src, cvGray, self.cv.COLOR_RGBA2GRAY);
      self.cv.GaussianBlur(cvGray, blurred, new self.cv.Size(5, 5), 0);
      self.cv.Canny(blurred, edges, 50, 150);
      self.cv.findContours(edges, contours, hierarchy, self.cv.RETR_EXTERNAL, self.cv.CHAIN_APPROX_SIMPLE);

      const found = [];
      const minArea = width * height * 0.08;

      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = self.cv.contourArea(cnt);
        if (area < minArea) {
          cnt.delete();
          continue;
        }
        const peri = self.cv.arcLength(cnt, true);
        const approx = new self.cv.Mat();
        self.cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        if (approx.rows === 4) {
          const pts = [];
          for (let r = 0; r < 4; r++) {
            pts.push({
              x: approx.intPtr(r, 0)[0],
              y: approx.intPtr(r, 0)[1],
            });
          }
          const ordered = orderQuadPoints(pts);
          found.push({
            area,
            corners: ordered.map((p) => ({ x: p.x / width, y: p.y / height })),
          });
        }
        approx.delete();
        cnt.delete();
      }

      src.delete();
      cvGray.delete();
      blurred.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();

      if (found.length > 0) {
        found.sort((a, b) => b.area - a.area);
        return found.slice(0, 3).map((f) => f.corners);
      }
    } catch {
      // Fall through to pure pixel bounding fallback
    }
  }

  // Pure pixel fallback: detect bright sheet region relative to darker border if present
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let brightCount = 0;
  let sumBright = 0;
  for (let i = 0; i < gray.length; i += 4) {
    sumBright += gray[i];
  }
  const avgGray = sumBright / (gray.length / 4);
  const brightThresh = Math.min(210, avgGray + 15);

  for (let y = 0; y < height; y += 2) {
    const row = y * width;
    for (let x = 0; x < width; x += 2) {
      if (gray[row + x] >= brightThresh) {
        brightCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const bw = maxX - minX;
  const bh = maxY - minY;
  if (brightCount > 100 && bw > width * 0.3 && bh > height * 0.3 && bw < width * 0.96) {
    return [
      [
        { x: minX / width, y: minY / height },
        { x: maxX / width, y: minY / height },
        { x: maxX / width, y: maxY / height },
        { x: minX / width, y: maxY / height },
      ],
    ];
  }

  // Final safe fallback: slight inset around full frame so manual calibration is immediately usable
  return [
    [
      { x: 0.04, y: 0.03 },
      { x: 0.96, y: 0.03 },
      { x: 0.96, y: 0.97 },
      { x: 0.04, y: 0.97 },
    ],
  ];
}

/**
 * Solves 8x8 linear system A * x = b using Gaussian elimination with partial pivoting.
 * Maps destination canonical point (u, v) -> source image point (x, y).
 */
function computeHomographyDstToSrc(srcPts, dstW, dstH) {
  const dstPts = [
    { x: 0, y: 0 },
    { x: dstW - 1, y: 0 },
    { x: dstW - 1, y: dstH - 1 },
    { x: 0, y: dstH - 1 },
  ];

  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const u = dstPts[i].x;
    const v = dstPts[i].y;
    const x = srcPts[i].x;
    const y = srcPts[i].y;
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  // Gaussian elimination
  for (let col = 0; col < 8; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(A[col][col]);
    for (let r = col + 1; r < 8; r++) {
      if (Math.abs(A[r][col]) > maxVal) {
        maxVal = Math.abs(A[r][col]);
        pivotRow = r;
      }
    }
    if (pivotRow !== col) {
      const tmpA = A[col]; A[col] = A[pivotRow]; A[pivotRow] = tmpA;
      const tmpB = b[col]; b[col] = b[pivotRow]; b[pivotRow] = tmpB;
    }
    const diag = A[col][col] || 1e-12;
    for (let r = col + 1; r < 8; r++) {
      const factor = A[r][col] / diag;
      for (let c = col; c < 8; c++) {
        A[r][c] -= factor * A[col][c];
      }
      b[r] -= factor * b[col];
    }
  }

  const h = new Float64Array(9);
  for (let r = 7; r >= 0; r--) {
    let sum = b[r];
    for (let c = r + 1; c < 8; c++) {
      sum -= A[r][c] * h[c];
    }
    h[r] = sum / (A[r][r] || 1e-12);
  }
  h[8] = 1;
  return h;
}

function warpPerspectiveSheet(rgba, srcW, srcH, normCorners) {
  const srcPts = normCorners.map((pt) => ({
    x: pt.x * (srcW - 1),
    y: pt.y * (srcH - 1),
  }));

  // Use OpenCV warpPerspective when OpenCV.js WASM is initialized
  if (openCvState === 'ready' && self.cv && self.cv.Mat) {
    try {
      const srcMat = new self.cv.Mat(srcH, srcW, self.cv.CV_8UC4);
      srcMat.data.set(rgba);
      const dstMat = new self.cv.Mat();
      const srcTri = self.cv.matFromArray(4, 1, self.cv.CV_32FC2, [
        srcPts[0].x, srcPts[0].y,
        srcPts[1].x, srcPts[1].y,
        srcPts[2].x, srcPts[2].y,
        srcPts[3].x, srcPts[3].y,
      ]);
      const dstTri = self.cv.matFromArray(4, 1, self.cv.CV_32FC2, [
        0, 0,
        CANONICAL_WIDTH - 1, 0,
        CANONICAL_WIDTH - 1, CANONICAL_HEIGHT - 1,
        0, CANONICAL_HEIGHT - 1,
      ]);
      const M = self.cv.getPerspectiveTransform(srcTri, dstTri);
      self.cv.warpPerspective(
        srcMat,
        dstMat,
        M,
        new self.cv.Size(CANONICAL_WIDTH, CANONICAL_HEIGHT),
        self.cv.INTER_LINEAR,
        self.cv.BORDER_REPLICATE
      );
      const out = new Uint8ClampedArray(dstMat.data);
      srcMat.delete();
      dstMat.delete();
      srcTri.delete();
      dstTri.delete();
      M.delete();
      return { rgba: out, engineUsed: 'opencv' };
    } catch {
      // Fallback to native bilinear homography
    }
  }

  const H = computeHomographyDstToSrc(srcPts, CANONICAL_WIDTH, CANONICAL_HEIGHT);
  const out = new Uint8ClampedArray(CANONICAL_WIDTH * CANONICAL_HEIGHT * 4);

  for (let v = 0; v < CANONICAL_HEIGHT; v++) {
    const rowOff = v * CANONICAL_WIDTH * 4;
    for (let u = 0; u < CANONICAL_WIDTH; u++) {
      const denom = H[6] * u + H[7] * v + 1;
      const sx = (H[0] * u + H[1] * v + H[2]) / denom;
      const sy = (H[3] * u + H[4] * v + H[5]) / denom;

      const x0 = Math.max(0, Math.min(srcW - 1, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(srcH - 1, Math.floor(sy)));
      const x1 = Math.min(srcW - 1, x0 + 1);
      const y1 = Math.min(srcH - 1, y0 + 1);
      const fx = sx - x0;
      const fy = sy - y0;

      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const dstIdx = rowOff + u * 4;
      out[dstIdx] = rgba[i00] * w00 + rgba[i10] * w10 + rgba[i01] * w01 + rgba[i11] * w11;
      out[dstIdx + 1] = rgba[i00 + 1] * w00 + rgba[i10 + 1] * w10 + rgba[i01 + 1] * w01 + rgba[i11 + 1] * w11;
      out[dstIdx + 2] = rgba[i00 + 2] * w00 + rgba[i10 + 2] * w10 + rgba[i01 + 2] * w01 + rgba[i11 + 2] * w11;
      out[dstIdx + 3] = 255;
    }
  }

  return { rgba: out, engineUsed: 'pixel-native' };
}

/**
 * Measures bubble interior shading ratio with quadrant uniformity check to ignore
 * stray marks, scratches, or printed bubble outline rings.
 */
function measureBubbleFill(bin, gray, width, height, cx, cy, radius) {
  const innerR = Math.max(3.5, radius * 0.66);
  const innerR2 = innerR * innerR;
  const xMin = Math.max(0, Math.floor(cx - innerR));
  const xMax = Math.min(width - 1, Math.ceil(cx + innerR));
  const yMin = Math.max(0, Math.floor(cy - innerR));
  const yMax = Math.min(height - 1, Math.ceil(cy + innerR));

  let totalPixels = 0;
  let darkPixels = 0;
  let darkIntensitySum = 0;
  const quadDark = [0, 0, 0, 0];
  const quadTotal = [0, 0, 0, 0];

  for (let y = yMin; y <= yMax; y++) {
    const dy = y - cy;
    const rowOff = y * width;
    for (let x = xMin; x <= xMax; x++) {
      const dx = x - cx;
      if (dx * dx + dy * dy <= innerR2) {
        const idx = rowOff + x;
        const qIdx = (dy >= 0 ? 2 : 0) + (dx >= 0 ? 1 : 0);
        totalPixels++;
        quadTotal[qIdx]++;
        if (bin[idx] === 1) {
          darkPixels++;
          quadDark[qIdx]++;
        }
        darkIntensitySum += 255 - gray[idx];
      }
    }
  }

  if (totalPixels === 0) return { score: 0, fillRatio: 0, uniformity: 0 };

  const fillRatio = darkPixels / totalPixels;
  // Count how many quadrants have noticeable shading (filters thin stray lines / corner smudges)
  let activeQuads = 0;
  for (let q = 0; q < 4; q++) {
    if (quadTotal[q] > 0 && quadDark[q] / quadTotal[q] >= 0.16) {
      activeQuads++;
    }
  }
  const uniformity = activeQuads / 4;
  const darknessNorm = darkIntensitySum / (totalPixels * 255);

  // If only 1 quadrant has pixels and fill is low, suppress stray smudge
  const smudgePenalty = activeQuads <= 1 && fillRatio < 0.42 ? 0.55 : 1.0;
  const combinedScore = (fillRatio * 0.78 + darknessNorm * 0.22) * smudgePenalty;

  return {
    score: Math.min(1, combinedScore),
    fillRatio,
    uniformity,
  };
}

/**
 * Analyzes all 40 or 50 questions on a perspective-warped canonical sheet.
 */
function analyzeWarpedSheetBubbles(warpedRgba, questionCount, optionCount) {
  const gray = rgbaToGrayscale(warpedRgba, CANONICAL_WIDTH, CANONICAL_HEIGHT);
  const blurred = gaussianBlur3x3(gray, CANONICAL_WIDTH, CANONICAL_HEIGHT);
  // Local window radius ~22px handles uneven shadows across paper cleanly
  const bin = adaptiveThresholdDark(blurred, CANONICAL_WIDTH, CANONICAL_HEIGHT, 22, 0.13);

  const layout = getBubbleGridLayout(questionCount, optionCount);
  const byQuestion = new Map();

  for (const item of layout) {
    if (!byQuestion.has(item.questionNumber)) {
      byQuestion.set(item.questionNumber, []);
    }
    byQuestion.get(item.questionNumber).push(item);
  }

  const questions = [];
  const uncertainQuestions = [];
  const doubleQuestions = [];
  const emptyQuestions = [];

  for (let q = 1; q <= questionCount; q++) {
    const options = byQuestion.get(q) || [];
    const readings = [];
    const fillRatios = {};

    for (const opt of options) {
      const baseCx = opt.nx * CANONICAL_WIDTH;
      const baseCy = opt.ny * CANONICAL_HEIGHT;
      const radius = opt.nr * CANONICAL_WIDTH;

      // Micro-search ±2px around expected center to resist subtle paper bend
      let best = measureBubbleFill(bin, blurred, CANONICAL_WIDTH, CANONICAL_HEIGHT, baseCx, baseCy, radius);
      let bestCx = baseCx;
      let bestCy = baseCy;

      for (const oy of [-2, 0, 2]) {
        for (const ox of [-2, 0, 2]) {
          if (ox === 0 && oy === 0) continue;
          const res = measureBubbleFill(
            bin,
            blurred,
            CANONICAL_WIDTH,
            CANONICAL_HEIGHT,
            baseCx + ox,
            baseCy + oy,
            radius
          );
          if (res.score > best.score) {
            best = res;
            bestCx = baseCx + ox;
            bestCy = baseCy + oy;
          }
        }
      }

      const roundedFill = Math.round(best.score * 1000) / 1000;
      fillRatios[opt.letter] = roundedFill;
      readings.push({
        letter: opt.letter,
        fillRatio: roundedFill,
        rawFill: best.fillRatio,
        uniformity: best.uniformity,
        cx: bestCx / CANONICAL_WIDTH,
        cy: bestCy / CANONICAL_HEIGHT,
        radius: opt.nr,
      });
    }

    const sorted = [...readings].sort((a, b) => b.fillRatio - a.fillRatio);
    const top1 = sorted[0];
    const top2 = sorted[1] || { fillRatio: 0, letter: '' };
    const baseline =
      sorted.slice(2).reduce((acc, r) => acc + r.fillRatio, 0) / Math.max(1, sorted.length - 2);

    const effective1 = Math.max(0, top1.fillRatio - baseline * 0.55);
    const effective2 = Math.max(0, top2.fillRatio - baseline * 0.55);
    const margin = effective1 - effective2;

    let selected = '';
    let status = 'empty';
    let confidence = 0.9;

    const EMPTY_THRESHOLD = 0.21;
    const CONFIDENT_THRESHOLD = 0.34;
    const DOUBLE_SECOND_THRESHOLD = 0.27;

    if (effective1 < EMPTY_THRESHOLD) {
      selected = '';
      status = 'empty';
      confidence = Math.min(0.98, 1 - effective1 * 2);
      emptyQuestions.push(q);
    } else if (
      effective2 >= DOUBLE_SECOND_THRESHOLD &&
      (margin < 0.14 || (effective1 >= 0.36 && effective2 >= 0.34))
    ) {
      selected = 'DOUBLE';
      status = 'double';
      confidence = 0.45;
      doubleQuestions.push(q);
    } else if (effective1 < CONFIDENT_THRESHOLD || margin < 0.12 || top1.uniformity < 0.5) {
      selected = top1.letter;
      status = 'uncertain';
      confidence = Math.max(0.4, Math.min(0.76, effective1 + margin));
      uncertainQuestions.push(q);
    } else {
      selected = top1.letter;
      status = 'confident';
      confidence = Math.min(0.99, 0.72 + effective1 * 0.25 + margin * 0.2);
    }

    questions.push({
      questionNumber: q,
      selected,
      status,
      confidence: Math.round(confidence * 100) / 100,
      fillRatios,
      bubbleCoords: readings.map((r) => ({
        letter: r.letter,
        fillRatio: r.fillRatio,
        cx: r.cx,
        cy: r.cy,
        radius: r.radius,
      })),
    });
  }

  return {
    questions,
    uncertainQuestions,
    doubleQuestions,
    emptyQuestions,
  };
}

self.onmessage = (event) => {
  const { type, payload } = event.data || {};

  if (type === 'init') {
    tryLoadOpenCv();
    self.postMessage({ type: 'ready', engine: openCvState === 'ready' ? 'opencv' : 'pixel-native' });
    return;
  }

  if (type === 'detect_quads') {
    const start = performance.now();
    try {
      const { width, height, buffer } = payload;
      const rgba = new Uint8ClampedArray(buffer);
      self.postMessage({ type: 'progress', percent: 25, label: 'Konversi grayscale & reduksi derau...' });
      const gray = rgbaToGrayscale(rgba, width, height);
      const blurred = gaussianBlur3x3(gray, width, height);

      self.postMessage({ type: 'progress', percent: 55, label: 'Mendeteksi penanda sudut (1–3 lembar)...' });
      const bin = adaptiveThresholdDark(blurred, width, height, Math.max(12, Math.floor(Math.min(width, height) * 0.03)), 0.16);
      const markers = findFiducialSquares(bin, width, height);
      let quads = groupFiducialsIntoSheets(markers, width, height);

      if (quads.length === 0) {
        quads = detectFallbackSheetQuads(rgba, blurred, width, height);
      }

      self.postMessage({
        type: 'quads_detected',
        quads,
        markerCount: markers.length,
        processingMs: Math.round(performance.now() - start),
      });
    } catch (err) {
      self.postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal mendeteksi posisi lembar jawaban.',
      });
    }
    return;
  }

  if (type === 'process_sheets') {
    const start = performance.now();
    try {
      const { width, height, buffer, questionCount, optionCount, manualQuads } = payload;
      const rgba = new Uint8ClampedArray(buffer);

      self.postMessage({ type: 'progress', percent: 15, label: 'Memproses grayscale & Gaussian blur...' });
      const gray = rgbaToGrayscale(rgba, width, height);
      const blurred = gaussianBlur3x3(gray, width, height);

      let targetQuads = Array.isArray(manualQuads) && manualQuads.length > 0 ? manualQuads.slice(0, 3) : null;

      if (!targetQuads) {
        self.postMessage({ type: 'progress', percent: 35, label: 'Mendeteksi posisi lembar LJK (maks. 3 lembar)...' });
        const bin = adaptiveThresholdDark(
          blurred,
          width,
          height,
          Math.max(12, Math.floor(Math.min(width, height) * 0.03)),
          0.16
        );
        const markers = findFiducialSquares(bin, width, height);
        targetQuads = groupFiducialsIntoSheets(markers, width, height);
        if (targetQuads.length === 0) {
          targetQuads = detectFallbackSheetQuads(rgba, blurred, width, height);
        }
      }

      const sheets = [];
      const transferables = [];

      for (let i = 0; i < targetQuads.length; i++) {
        const sheetStart = performance.now();
        const basePct = 45 + Math.round((i / targetQuads.length) * 50);
        self.postMessage({
          type: 'progress',
          percent: basePct,
          label: `Koreksi perspektif & baca arsiran Lembar ${i + 1} dari ${targetQuads.length}...`,
        });

        const warped = warpPerspectiveSheet(rgba, width, height, targetQuads[i]);
        const analysis = analyzeWarpedSheetBubbles(warped.rgba, questionCount, optionCount);

        const copyBuf = warped.rgba.buffer;
        transferables.push(copyBuf);

        sheets.push({
          sheetIndex: i,
          corners: targetQuads[i],
          warpedWidth: CANONICAL_WIDTH,
          warpedHeight: CANONICAL_HEIGHT,
          warpedBuffer: copyBuf,
          engineUsed: warped.engineUsed,
          processingMs: Math.round(performance.now() - sheetStart),
          ...analysis,
        });
      }

      self.postMessage({ type: 'progress', percent: 100, label: 'Pemindaian selesai.' });
      self.postMessage(
        {
          type: 'sheets_processed',
          sheets,
          totalProcessingMs: Math.round(performance.now() - start),
        },
        transferables
      );
    } catch (err) {
      self.postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses gambar LJK.',
      });
    }
  }
};
