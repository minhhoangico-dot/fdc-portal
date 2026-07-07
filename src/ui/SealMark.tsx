/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SealMark — the con dấu đỏ (red approval seal), the design system's one
 * deliberate aesthetic risk (direction doc §5.3).
 *
 * Circular vermilion (--color-danger-600) stamp with a fixed slight rotation,
 * centred approver name + "hoàn tất phê duyệt" + date. Pure presentational:
 * no supabase, no viewmodels, NO animation. Restraint lives in placement —
 * this renders ONLY on a fully-approved request's detail + print surfaces,
 * never in a list. Lists use StatusBadge instead.
 */

export interface SealMarkProps {
  /** Name of the final approver, shown centred in the seal. */
  approverName: string;
  /** Already-formatted approval date string. */
  date: string;
  /** Optional role label of the approver (e.g. "Kế toán trưởng"). */
  roleLabel?: string;
  className?: string;
}

export function SealMark({ approverName, date, roleLabel, className = '' }: SealMarkProps) {
  return (
    <div
      role="img"
      aria-label={`Đã hoàn tất phê duyệt bởi ${approverName} ngày ${date}`}
      className={`inline-flex select-none items-center justify-center ${className}`.trim()}
      style={{ transform: 'rotate(-6deg)' }}
    >
      <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-[3px] border-danger-600 text-danger-600">
        {/* inner concentric ring — reinforces the stamp silhouette */}
        <div className="pointer-events-none absolute inset-[7px] rounded-full border border-danger-600/60" />

        <div className="flex flex-col items-center px-4 text-center leading-tight">
          <div className="text-[13px] font-bold tracking-tight">{approverName}</div>
          {roleLabel ? (
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-danger-600/80">
              {roleLabel}
            </div>
          ) : null}
          <div className="my-1 h-px w-8 bg-danger-600/50" />
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em]">
            hoàn tất phê duyệt
          </div>
          <div className="mt-0.5 text-[10px] font-medium text-danger-600/80">{date}</div>
        </div>
      </div>
    </div>
  );
}

export default SealMark;
