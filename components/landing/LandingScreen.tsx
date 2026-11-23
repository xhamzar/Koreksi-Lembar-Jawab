'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  Camera,
  Files,
  LayoutGrid,
  Settings,
  Smartphone,
  WifiOff,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppContext';
import { PWAInstallButton } from '@/components/ui/AppOverlays';

const PREVIEW_ROWS: Array<{ num: number; filled: string; dividerAfter?: boolean }> = [
  { num: 1, filled: 'B' },
  { num: 2, filled: 'B' },
  { num: 3, filled: 'B', dividerAfter: true },
  { num: 4, filled: 'B' },
];

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

const FEATURES = [
  {
    titleLine1: '3 Lembar',
    titleLine2: 'Sekali Foto',
    icon: Files,
  },
  {
    titleLine1: '40 & 50',
    titleLine2: 'Soal',
    icon: LayoutGrid,
  },
  {
    titleLine1: 'Data di',
    titleLine2: 'HP Anda',
    icon: Smartphone,
  },
  {
    titleLine1: 'Tanpa',
    titleLine2: 'Akun',
    icon: WifiOff,
  },
];

export function LandingScreen() {
  const { settings, enterApp, setActiveTab } = useApp();
  const emblemSrc = settings.customEmblemDataUrl || '/school-emblem.png';

  const handleOpenScanner = () => {
    setActiveTab('scanner');
    enterApp();
  };

  const handleOpenSettings = () => {
    setActiveTab('settings');
    enterApp();
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-white text-[#071A34] transition-colors dark:bg-[#0B1220] dark:text-slate-100">
      {/* Top Compact Bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-2xl items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5 shadow-xs ring-1 ring-slate-200/80 dark:ring-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={emblemSrc}
              alt={`Logo ${settings.schoolName}`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="truncate text-lg font-extrabold tracking-tight text-[#071A34] dark:text-white sm:text-xl">
            {settings.schoolName}
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenSettings}
          aria-label="Buka Pengaturan Ujian"
          title="Pengaturan Ujian"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[#071A34] transition hover:bg-slate-100 active:scale-95 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Settings className="h-6 w-6" />
        </button>
      </header>

      {/* Main Centered Content */}
      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 pb-20 pt-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="flex w-full flex-col items-center text-center"
        >
          {/* Crisp Framed LJK Scan Illustration */}
          <div
            aria-hidden="true"
            className="relative mb-7 flex h-44 w-60 items-center justify-center sm:h-48 sm:w-64"
          >
            {/* Soft pastel sky-blue backdrop circles */}
            <div className="absolute h-36 w-48 -rotate-6 rounded-full bg-[#DCEEFF]/90 blur-[1px] dark:bg-sky-900/35" />
            <div className="absolute -right-1 top-3 h-28 w-28 rounded-full bg-[#CFE6FF]/70 dark:bg-sky-800/30" />

            {/* Scanner 4 Corner Brackets */}
            <div className="relative flex h-40 w-48 items-center justify-center">
              <span className="absolute left-0 top-1 h-7 w-7 -rotate-6 rounded-tl-xl border-l-[3.5px] border-t-[3.5px] border-[#0A2A78] dark:border-sky-400" />
              <span className="absolute right-0 top-2 h-7 w-7 rotate-3 rounded-tr-xl border-r-[3.5px] border-t-[3.5px] border-[#0A2A78] dark:border-sky-400" />
              <span className="absolute bottom-1 left-0 h-7 w-7 rotate-3 rounded-bl-xl border-b-[3.5px] border-l-[3.5px] border-[#0A2A78] dark:border-sky-400" />
              <span className="absolute bottom-0 right-1 h-7 w-7 -rotate-6 rounded-br-xl border-b-[3.5px] border-r-[3.5px] border-[#0A2A78] dark:border-sky-400" />

              {/* Tilted Mini LJK Sheet Card */}
              <div className="w-[158px] -rotate-2 rounded-2xl border-2 border-[#3B82F6] bg-white px-3 py-3 shadow-md shadow-sky-900/10 dark:border-sky-500 dark:bg-[#131D2E]">
                <div className="space-y-1.5">
                  {PREVIEW_ROWS.map((row) => (
                    <React.Fragment key={row.num}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono-num w-3 text-left text-[10px] font-extrabold text-[#1E56A0] dark:text-sky-300">
                          {row.num}
                        </span>
                        <div className="flex items-center gap-1">
                          {LETTERS.map((ltr) => {
                            const isFilled = row.filled === ltr;
                            return (
                              <span
                                key={ltr}
                                className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[8px] font-bold ${
                                  isFilled
                                    ? 'bg-[#0C2B64] text-white dark:bg-sky-400 dark:text-[#071A34]'
                                    : 'border border-[#7BA7DE] text-[#1E56A0] dark:border-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {ltr}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      {row.dividerAfter && (
                        <div className="my-1 border-t border-dashed border-[#93B8E8] dark:border-slate-700" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Headline & Subtitle */}
          <h1 className="text-balance text-3xl font-extrabold tracking-tight text-[#071A34] dark:text-white sm:text-4xl">
            Koreksi Lembar Jawab
          </h1>
          <p className="mt-2.5 max-w-xs text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:max-w-sm">
            Koreksi pilihan ganda otomatis dari foto, langsung di HP Anda.
          </p>

          {/* Primary Royal Blue Pill CTA -> Directly Opens Scanner */}
          <div className="mt-7 flex w-full max-w-md flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleOpenScanner}
              className="flex min-h-[58px] w-full items-center justify-center gap-3 rounded-full bg-[#005EC4] px-7 text-lg font-bold text-white shadow-lg shadow-[#005EC4]/25 transition hover:bg-[#004FA8] active:scale-[0.985]"
            >
              <Camera className="h-6 w-6 shrink-0" />
              <span>Mulai Mengoreksi</span>
            </button>

            <PWAInstallButton variant="light" />
          </div>

          {/* 2x2 Clean Feature Grid */}
          <div className="mt-7 grid w-full max-w-md grid-cols-2 gap-3.5 sm:gap-4">
            {FEATURES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.titleLine1}
                  className="flex flex-col items-center justify-center rounded-3xl bg-[#F3F6FA] px-4 py-5 text-center dark:bg-[#131D2E]"
                >
                  <Icon className="h-8 w-8 text-[#005EC4] dark:text-sky-400" strokeWidth={1.9} />
                  <p className="mt-2.5 text-sm font-bold leading-snug text-[#071A34] dark:text-slate-100">
                    {item.titleLine1}
                    <br />
                    {item.titleLine2}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </main>

      {/* Bottom Soft Layered Blue Wave */}
      <div aria-hidden="true" className="pointer-events-none relative h-20 w-full shrink-0 sm:h-24">
        <svg
          viewBox="0 0 1440 160"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-full w-full"
        >
          <path
            d="M0,104 C280,55 580,152 940,115 C1170,92 1320,38 1440,18 L1440,160 L0,160 Z"
            fill="#4B92E5"
            className="opacity-85 dark:opacity-35"
          />
          <path
            d="M0,122 C310,82 640,160 1010,126 C1215,107 1345,76 1440,60 L1440,160 L0,160 Z"
            fill="#1972D2"
            className="opacity-95 dark:opacity-50"
          />
        </svg>
      </div>
    </div>
  );
}
