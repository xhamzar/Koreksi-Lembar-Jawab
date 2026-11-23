'use client';

import React, { useRef, useState } from 'react';
import {
  Crop,
  Plus,
  RotateCcw,
  RotateCw,
  ScanSearch,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { Point2D, SheetQuad } from '@/lib/types';

interface CornerCalibratorProps {
  previewDataUrl: string;
  quads: SheetQuad[];
  onQuadsChange: (quads: SheetQuad[]) => void;
  onRotate: (deltaDeg: number) => void;
  cropMargin: number;
  onCropMarginChange: (margin: number) => void;
  onAutoDetectQuads: () => void;
  onRunOmr: () => void;
  onCancel: () => void;
  isBusy: boolean;
}

const SHEET_COLORS = [
  { stroke: '#0EA5E9', fill: 'rgba(14, 165, 233, 0.14)', badge: 'bg-sky-600' },
  { stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.14)', badge: 'bg-emerald-600' },
  { stroke: '#F59E0B', fill: 'rgba(245, 158, 11, 0.14)', badge: 'bg-amber-600' },
];

const CORNER_LABELS = ['TL', 'TR', 'BR', 'BL'];

export function CornerCalibrator({
  previewDataUrl,
  quads,
  onQuadsChange,
  onRotate,
  cropMargin,
  onCropMarginChange,
  onAutoDetectQuads,
  onRunOmr,
  onCancel,
  isBusy,
}: CornerCalibratorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ sheetIdx: number; cornerIdx: number } | null>(null);
  const [showCropControls, setShowCropControls] = useState(false);

  const updateCornerFromPointer = (clientX: number, clientY: number) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = Math.max(0.005, Math.min(0.995, (clientX - rect.left) / rect.width));
    const ny = Math.max(0.005, Math.min(0.995, (clientY - rect.top) / rect.height));

    const next = quads.map((q, sIdx) => {
      if (sIdx !== dragging.sheetIdx) return q;
      const corners = [...q.corners] as [Point2D, Point2D, Point2D, Point2D];
      corners[dragging.cornerIdx] = { x: nx, y: ny };
      return { ...q, corners };
    });
    onQuadsChange(next);
  };

  const handleAddSheetQuad = () => {
    if (quads.length >= 3) return;
    const idx = quads.length;
    const xStart = idx === 0 ? 0.05 : idx === 1 ? 0.36 : 0.67;
    const xEnd = Math.min(0.96, xStart + 0.29);
    const newQuad: SheetQuad = {
      id: `manual_${Date.now()}`,
      label: `Lembar ${idx + 1}`,
      corners: [
        { x: xStart, y: 0.08 },
        { x: xEnd, y: 0.08 },
        { x: xEnd, y: 0.92 },
        { x: xStart, y: 0.92 },
      ],
    };
    onQuadsChange([...quads, newQuad]);
  };

  const handleRemoveQuad = (idx: number) => {
    if (quads.length <= 1) return;
    const remaining = quads
      .filter((_, i) => i !== idx)
      .map((q, i) => ({ ...q, label: `Lembar ${i + 1}` }));
    onQuadsChange(remaining);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-slate-200/70 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-[#131D2E]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRotate(-90)}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RotateCcw className="h-4 w-4" />
            Putar Kiri
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRotate(90)}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 bg-[#F4F8FB] px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RotateCw className="h-4 w-4" />
            Putar Kanan
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setShowCropControls((v) => !v)}
            className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
              showCropControls
                ? 'border-[#1273AA] bg-[#E9F3FA] text-[#1273AA] dark:bg-sky-950/60 dark:text-sky-300'
                : 'border-slate-200 bg-[#F4F8FB] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            <Crop className="h-4 w-4" />
            Potong Tepi
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={isBusy}
            onClick={onAutoDetectQuads}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-amber-50 px-3 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300"
          >
            <Sparkles className="h-4 w-4" />
            Deteksi Otomatis
          </button>
          {quads.length < 3 && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleAddSheetQuad}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              <Plus className="h-4 w-4" />
              Tambah Lembar ({quads.length}/3)
            </button>
          )}
        </div>
      </div>

      {/* Optional Crop Margin Slider */}
      {showCropControls && (
        <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#131D2E]">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Potong tepi gambar (Crop)</span>
            <span className="font-mono-num">{Math.round(cropMargin * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.22}
            step={0.01}
            value={cropMargin}
            onChange={(e) => onCropMarginChange(Number(e.target.value))}
            className="mt-2 w-full accent-[#1273AA]"
          />
        </div>
      )}

      {/* Interactive Image + Draggable 4-Corner Quads */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#131D2E]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Geser 4 titik sudut ke pusat kotak hitam penanda LJK (mendukung 1–3 lembar sekaligus).
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {quads.map((q, idx) => (
              <span
                key={q.id}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${SHEET_COLORS[idx % SHEET_COLORS.length].badge}`}
                />
                {q.label}
                {quads.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveQuad(idx)}
                    aria-label={`Hapus ${q.label}`}
                    className="ml-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        <div
          ref={containerRef}
          onPointerMove={(e) => updateCornerFromPointer(e.clientX, e.clientY)}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
          className="relative mx-auto w-full max-w-2xl touch-none select-none overflow-hidden rounded-2xl bg-slate-950"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewDataUrl}
            alt="Pratinjau kalibrasi LJK"
            draggable={false}
            referrerPolicy="no-referrer"
            className="block w-full object-contain"
          />

          {/* SVG Polygon Overlays */}
          <svg
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            {quads.map((quad, sIdx) => {
              const color = SHEET_COLORS[sIdx % SHEET_COLORS.length];
              const points = quad.corners
                .map((p) => `${(p.x * 1000).toFixed(1)},${(p.y * 1000).toFixed(1)}`)
                .join(' ');
              return (
                <polygon
                  key={quad.id}
                  points={points}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth="4"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {/* Draggable Corner Handles */}
          {quads.map((quad, sIdx) => {
            const color = SHEET_COLORS[sIdx % SHEET_COLORS.length];
            return quad.corners.map((pt, cIdx) => (
              <button
                key={`${quad.id}_${cIdx}`}
                type="button"
                aria-label={`${quad.label} sudut ${CORNER_LABELS[cIdx]}`}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging({ sheetIdx: sIdx, cornerIdx: cIdx });
                }}
                style={{
                  left: `${pt.x * 100}%`,
                  top: `${pt.y * 100}%`,
                }}
                className={`absolute -ml-4 -mt-4 flex h-8 w-8 cursor-grab items-center justify-center rounded-full border-2 border-white text-[10px] font-extrabold text-white shadow-lg active:scale-110 active:cursor-grabbing ${color.badge}`}
              >
                {sIdx + 1}
              </button>
            ));
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={onCancel}
            className="min-h-[48px] rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Ganti Foto
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={onRunOmr}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1273AA] px-6 text-sm font-bold text-white shadow-md shadow-[#1273AA]/20 transition hover:bg-[#0E5E8C] disabled:opacity-60 sm:flex-none"
          >
            <ScanSearch className="h-5 w-5" />
            <span>Pindai & Baca {quads.length} Lembar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
