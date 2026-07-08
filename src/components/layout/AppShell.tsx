/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ActionableDataProvider } from '@/contexts/ActionableDataContext';
import { useActionableCount } from '@/viewmodels/useActionableCount';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function AppShell() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <ActionableDataProvider>
      <AppShellChrome />
    </ActionableDataProvider>
  );
}

function AppShellChrome() {
  const { total } = useActionableCount();
  const shellStyle = { ['--sidebar-width' as string]: '264px' } as React.CSSProperties;

  return (
    <div className="flex min-h-screen bg-paper text-ink-900" style={shellStyle}>
      <Sidebar pendingCount={total} />

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 lg:pb-6">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav pendingCount={total} />
    </div>
  );
}
