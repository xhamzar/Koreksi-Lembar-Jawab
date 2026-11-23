'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { AppProvider, useApp } from '@/components/providers/AppContext';
import { LandingScreen } from '@/components/landing/LandingScreen';
import { AppShell } from '@/components/navigation/AppShell';
import { SettingsView } from '@/components/settings/SettingsView';
import { ScannerView } from '@/components/scanner/ScannerView';
import { ResultsView } from '@/components/results/ResultsView';
import { HistoryView } from '@/components/history/HistoryView';
import {
  ConfirmModal,
  OfflineIndicator,
  ToastContainer,
} from '@/components/ui/AppOverlays';

function AppRouterContent() {
  const { isLoading, hasEntered, activeTab } = useApp();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#08101C] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#68C9F2]" />
        <p className="text-sm font-semibold text-slate-300">
          Memuat database lokal Koreksi Lembar Jawab...
        </p>
      </div>
    );
  }

  if (!hasEntered) {
    return <LandingScreen />;
  }

  return (
    <AppShell>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'scanner' && <ScannerView />}
          {activeTab === 'results' && <ResultsView />}
          {activeTab === 'history' && <HistoryView />}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}

export function AppRoot() {
  return (
    <AppProvider>
      <AppRouterContent />
      <ToastContainer />
      <ConfirmModal />
      <OfflineIndicator />
    </AppProvider>
  );
}
