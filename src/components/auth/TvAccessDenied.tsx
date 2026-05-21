/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { OnsiteAccessDenied } from '@/components/auth/OnsiteAccessDenied';

export function TvAccessDenied({
  description,
  onRetry,
}: {
  description: string;
  onRetry: () => void;
}) {
  return (
    <OnsiteAccessDenied
      title="Khong the mo man hinh TV"
      description={description}
      onRetry={onRetry}
    />
  );
}
