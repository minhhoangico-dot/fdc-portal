/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  LabDashboardDetailDatasetInfo,
  LabDashboardDetailMetricExplanation,
  LabDashboardDetailPipelineStep,
  LabDashboardDetailSourceInfo,
} from '@/types/labDashboard';

export interface LabDashboardSourceSummaryBlock {
  kind: 'summary';
  summary: string;
  displayedRowCount: number | null;
}

export interface LabDashboardSourcePipelineBlock {
  kind: 'pipeline';
  steps: LabDashboardDetailPipelineStep[];
}

export interface LabDashboardSourceFocusReasonBlock {
  kind: 'focusReason';
  reason: string;
}

export interface LabDashboardSourceMetricExplanationBlock {
  kind: 'metricExplanation';
  items: LabDashboardDetailMetricExplanation[];
}

export interface LabDashboardSourceDatasetsBlock {
  kind: 'datasets';
  items: LabDashboardDetailDatasetInfo[];
}

export interface LabDashboardSourceLegacyNotesBlock {
  kind: 'legacyNotes';
  notes: string[];
}

export type LabDashboardSourceDetailsBlock =
  | LabDashboardSourceSummaryBlock
  | LabDashboardSourcePipelineBlock
  | LabDashboardSourceFocusReasonBlock
  | LabDashboardSourceMetricExplanationBlock
  | LabDashboardSourceDatasetsBlock
  | LabDashboardSourceLegacyNotesBlock;

export interface LabDashboardSourceDetailsView {
  error?: string;
  blocks: LabDashboardSourceDetailsBlock[];
}

function hasStructuredProvenance(sourceInfo: LabDashboardDetailSourceInfo): boolean {
  return Boolean(
    sourceInfo.summary ||
      sourceInfo.pipeline?.length ||
      sourceInfo.focusReason ||
      sourceInfo.metricExplanation?.length ||
      sourceInfo.datasets?.length,
  );
}

export function buildLabDashboardSourceDetails(sourceInfo: LabDashboardDetailSourceInfo): LabDashboardSourceDetailsView {
  const blocks: LabDashboardSourceDetailsBlock[] = [];
  const structured = hasStructuredProvenance(sourceInfo);

  if (sourceInfo.summary) {
    blocks.push({
      kind: 'summary',
      summary: sourceInfo.summary,
      displayedRowCount: sourceInfo.displayedRowCount ?? null,
    });
  }

  if (sourceInfo.pipeline?.length) {
    blocks.push({
      kind: 'pipeline',
      steps: [...sourceInfo.pipeline],
    });
  }

  if (sourceInfo.focusReason) {
    blocks.push({
      kind: 'focusReason',
      reason: sourceInfo.focusReason,
    });
  }

  if (sourceInfo.metricExplanation?.length) {
    blocks.push({
      kind: 'metricExplanation',
      items: [...sourceInfo.metricExplanation],
    });
  }

  if (sourceInfo.datasets?.length) {
    blocks.push({
      kind: 'datasets',
      items: [...sourceInfo.datasets],
    });
  }

  if (!structured && sourceInfo.calculationNotes.length > 0) {
    blocks.push({
      kind: 'legacyNotes',
      notes: [...sourceInfo.calculationNotes],
    });
  }

  return {
    error: sourceInfo.error,
    blocks,
  };
}
