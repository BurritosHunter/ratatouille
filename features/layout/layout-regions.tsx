import type { ReactNode } from "react";
import type { LayoutOption } from "@/lib/assistant-tools/layout-regions";

export type LayoutRegionSlot = ReactNode | null | undefined;

type Props = {
  layout: LayoutOption | undefined;
  regions: readonly LayoutRegionSlot[];
};

const regionCardClass = "rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-sm";
const scrollCellClass = `flex min-h-0 min-w-0 flex-col gap-3 overflow-auto ${regionCardClass}`;

function nonNullTrailingSlots(regionSlots: readonly LayoutRegionSlot[]): ReactNode[] {
  return regionSlots.slice(1).filter((slot): slot is Exclude<typeof slot, null | undefined | false> => slot != null && slot !== false);
}

function StackedTrailingColumn({ trailingNodes }: { trailingNodes: readonly ReactNode[] }) {
  if (trailingNodes.length === 0) { return null; }

  if (trailingNodes.length === 1) {
    return <>{trailingNodes[0]}</>;
  }
  return (
    <div className="flex min-h-0 flex-col gap-3">
      {trailingNodes.map((node, slotIndex) => (
        <div key={slotIndex}>{node}</div>
      ))}
    </div>
  );
}

export function LayoutRegions({ layout, regions }: Props) {
  const resolvedLayout: LayoutOption = layout ?? "singleColumn";
  const primarySlot = regions[0];
  const trailingNodeList = nonNullTrailingSlots(regions);

  if (resolvedLayout === "twoColumn") {
    return (
      <div className="grid min-h-[12rem] grid-cols-1 gap-4 md:grid-cols-2">
        <div aria-hidden={primarySlot == null ? true : undefined} className={`min-h-[8rem] ${scrollCellClass}`}>
          {primarySlot}
        </div>
        <div className={scrollCellClass}>
          <StackedTrailingColumn trailingNodes={trailingNodeList} />
        </div>
      </div>
    );
  }

  const stackedSlots = regions.map((slot, slotIndex) => ({ slot, slotIndex })).filter(({ slot }) => slot != null && slot !== false);

  return (
    <div className="flex min-h-[12rem] min-w-0 flex-col gap-4">
      {stackedSlots.map(({ slot, slotIndex }) => (
        <div key={slotIndex} className={scrollCellClass}>
          {slot}
        </div>
      ))}
    </div>
  );
}
