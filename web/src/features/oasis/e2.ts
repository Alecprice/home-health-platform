/**
 * OASIS-E2 integration boundary.
 * Current CMS production instrument effective 2026-04-01.
 * We intentionally do not duplicate the full federal instrument here yet.
 * A validated import/mapping layer should ingest official item metadata and data-spec edits.
 */
export const OASIS_E2 = {
  instrument: 'OASIS-E2',
  effectiveDate: '2026-04-01',
  dataSpecificationVersion: '3.02.0',
  supportedTimePoints: ['SOC', 'ROC', 'Follow-up', 'Transfer', 'Discharge'] as const,
  implementationStatus: 'scaffold-only' as const
};

export type OasisTimePoint = typeof OASIS_E2.supportedTimePoints[number];
