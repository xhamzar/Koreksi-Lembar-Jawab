'use client';

import React from 'react';
import {
  BarChart2,
  History,
  Home,
  Moon,
  Scan,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppContext';
import type { NavTab } from '@/lib/types';
import { PWAInstallButton } from '@/components/ui/AppOverlays';

const NAV_ITEMS: Array<{
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'settings', label: 'Pengaturan', icon: SlidersHorizontal },
  { id: 'scanner', label: 'Pindai', icon: Scan },
  { id: 'results', label: 'Hasil', icon: BarChart2 },
  { id: 'history', label: 'Riwayat', icon: History },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    settings,
    activeExam,
    activeTab,
    setActiveTab,
    toggleTheme,
    showLanding,
    activeExamResults,
  } = useApp();

  const emblemSrc = settings.customEmblemDataUrl || '/school-emblem.png';

  return (
    <div className="min-h-screen bg-[#EFF5F9] text-slate-900 transition-colors dark:bg-[#0B1220] dark:text-slate-100 lg:flex">
      {/* Desktop Left Sidebar */}
      <aside className="no-print hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col lg:justify-between lg:border-r lg:border-slate-200/80 lg:bg-white/95 lg:p-5 lg:dark:border-slate-800 lg:dark:bg-[#0F172A]">
        <div className="space-y-6">
          {/* Brand */}
          <button
            type="button"
            onClick={showLanding}
            className="flex w-full items-center gap-3 rounded-2xl p-1.5 text-left transition hover:bg-slate-100/80 dark:hover:bg-slate-800/70"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={emblemSrc}
                alt={`Logo ${settings.schoolName}`}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                Koreksi Lembar Jawab
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {settings.schoolName}
              </p>
            </div>
          </button>

          {/* Active Exam Context Summary */}
          {activeExam && (
            <div className="rounded-2xl border border-slate-200/80 bg-[#F4F8FB] p-3.5 dark:border-slate-800 dark:bg-slate-900/80">
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                UJIAN AKTIF
              </p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                {activeExam.examType} · {activeExam.subject}
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                {activeExam.className} · {activeExam.questionCount} soal · {activeExamResults.length} siswa
              </p>
            </div>
          )}

          {/* Sidebar Nav */}
          <nav aria-label="Navigasi utama" className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex min-h-[46px] w-full items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[#1273AA] text-white shadow-sm shadow-[#1273AA]/25'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Controls */}
        <div className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <PWAInstallButton variant="light" />

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={showLanding}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <Home className="h-4 w-4" />
              Beranda
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Ubah mode tampilan terang atau gelap"
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                  settings.theme === 'light'
                    ? 'bg-[#1273AA] text-white shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
              </span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                  settings.theme === 'dark'
                    ? 'bg-[#1273AA] text-white shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile Compact Header (matches reference screenshot) */}
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/70 bg-[#EFF5F9]/90 px-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0B1220]/90 lg:hidden">
          <button
            type="button"
            onClick={showLanding}
            className="flex min-w-0 items-center gap-2.5 text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={emblemSrc}
                alt={`Logo ${settings.schoolName}`}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold leading-tight text-slate-900 dark:text-white">
                Koreksi Lembar Jawab
              </p>
              <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {settings.schoolName}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Ubah mode terang atau gelap"
            className="flex min-h-[38px] items-center gap-0.5 rounded-full border border-slate-200/90 bg-white p-1 shadow-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                settings.theme === 'light'
                  ? 'bg-[#1273AA] text-white'
                  : 'text-slate-400'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
            </span>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                settings.theme === 'dark'
                  ? 'bg-[#1273AA] text-white'
                  : 'text-slate-400'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
            </span>
          </button>
        </header>

        {/* Scrollable Workspace Content */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>

        {/* Mobile Fixed Bottom Navigation (matches reference screenshot, <= 15% sticky cap) */}
        <nav
          aria-label="Navigasi bawah"
          className="no-print pb-safe fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#0F172A]/95 lg:hidden"
        >
          <div className="mx-auto grid h-16 max-w-lg grid-cols-4 items-center px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl transition ${
                    isActive
                      ? 'bg-[#E9F4FB] text-[#1273AA] dark:bg-sky-950/60 dark:text-sky-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
