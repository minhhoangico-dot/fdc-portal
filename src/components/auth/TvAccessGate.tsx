/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { OnsiteAccessGate } from '@/components/auth/OnsiteAccessGate';

export function TvAccessGate({ children }: { children: React.ReactNode }) {
  return <OnsiteAccessGate surface="tv_display">{children}</OnsiteAccessGate>;
}
