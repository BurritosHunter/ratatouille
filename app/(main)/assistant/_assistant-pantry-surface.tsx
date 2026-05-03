"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import type { PantryToolRow } from "@/lib/ai/assistant-tools/pantry-rows";
import type { PantryItemKind, PantryStorageLocation } from "@/lib/models/pantry-inventory";
import { cn } from "@/lib/helpers/utils";
import { useTranslation } from "react-i18next";

const STORAGE_ORDER: readonly PantryStorageLocation[] = ["fridge", "pantry", "storage", "freezer"] as const;
const KIND_ORDER: readonly PantryItemKind[] = ["ingredient", "meal", "custom"] as const;

type StorageFilter = PantryStorageLocation | "all";
type KindFilter = PantryItemKind | "all";
type SortOption = "nameAsc" | "storageAsc" | "kindAsc" | "expiresAsc" | "expiresDesc";

function storageRank(location: PantryStorageLocation): number {
  const index = STORAGE_ORDER.indexOf(location);
  return index === -1 ? STORAGE_ORDER.length : index;
}

function kindRank(kind: PantryItemKind): number {
  const index = KIND_ORDER.indexOf(kind);
  return index === -1 ? KIND_ORDER.length : index;
}

function compareIsoDates(left: string | null, right: string | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left.localeCompare(right);
}

export function AssistantPantrySurface({ rows }: { rows: PantryToolRow[] }) {
  const { t: translate } = useTranslation();
  const [storageCategory, setStorageCategory] = useState<StorageFilter>("all");
  const [kindCategory, setKindCategory] = useState<KindFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("nameAsc");

  const filteredSortedRows = useMemo(() => {
    let next = rows;
    if (storageCategory !== "all") {
      next = next.filter((row) => row.storageLocation === storageCategory);
    }
    if (kindCategory !== "all") {
      next = next.filter((row) => row.itemKind === kindCategory);
    }
    const copy = [...next];
    copy.sort((left, right) => {
      if (sortBy === "nameAsc") {
        const nameCmp = left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" });
        if (nameCmp !== 0) return nameCmp;
        return left.id - right.id;
      }
      if (sortBy === "storageAsc") {
        const storageCmp = storageRank(left.storageLocation) - storageRank(right.storageLocation);
        if (storageCmp !== 0) return storageCmp;
        const nameCmp = left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" });
        if (nameCmp !== 0) return nameCmp;
        return left.id - right.id;
      }
      if (sortBy === "kindAsc") {
        const kindCmp = kindRank(left.itemKind) - kindRank(right.itemKind);
        if (kindCmp !== 0) return kindCmp;
        const nameCmp = left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" });
        if (nameCmp !== 0) return nameCmp;
        return left.id - right.id;
      }
      const dateCmp = compareIsoDates(left.expiresOn, right.expiresOn);
      if (dateCmp !== 0) return sortBy === "expiresAsc" ? dateCmp : -dateCmp;
      const nameCmp = left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" });
      if (nameCmp !== 0) return nameCmp;
      return left.id - right.id;
    });
    return copy;
  }, [rows, storageCategory, kindCategory, sortBy]);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{translate("assistant.pantrySurface.emptyInventory")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{translate("pantry.title")}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{translate("assistant.pantrySurface.storageFilterLabel")}</span>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={translate("assistant.pantrySurface.storageFilterAria")}>
              <Button
                type="button"
                size="sm"
                variant={storageCategory === "all" ? "default" : "outline"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setStorageCategory("all")}
              >
                {translate("assistant.pantrySurface.storageAll")}
              </Button>
              {STORAGE_ORDER.map((location) => (
                <Button
                  key={location}
                  type="button"
                  size="sm"
                  variant={storageCategory === location ? "default" : "outline"}
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => setStorageCategory(location)}
                >
                  {translate(`pantry.storage.${location}`)}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{translate("assistant.pantrySurface.kindFilterLabel")}</span>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={translate("assistant.pantrySurface.kindFilterAria")}>
              <Button
                type="button"
                size="sm"
                variant={kindCategory === "all" ? "default" : "outline"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setKindCategory("all")}
              >
                {translate("assistant.pantrySurface.kindAll")}
              </Button>
              {KIND_ORDER.map((kind) => (
                <Button
                  key={kind}
                  type="button"
                  size="sm"
                  variant={kindCategory === kind ? "default" : "outline"}
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => setKindCategory(kind)}
                >
                  {translate(`pantry.kind.${kind}`)}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex w-full min-w-[12rem] flex-col gap-1 sm:w-auto">
            <FieldLabel htmlFor="assistant-pantry-sort" className="text-xs font-medium text-muted-foreground">
              {translate("assistant.pantrySurface.sortLabel")}
            </FieldLabel>
            <select
              id="assistant-pantry-sort"
              className={cn(
                "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none",
                "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              )}
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
            >
              <option value="nameAsc">{translate("assistant.pantrySurface.sortNameAsc")}</option>
              <option value="storageAsc">{translate("assistant.pantrySurface.sortStorageAsc")}</option>
              <option value="kindAsc">{translate("assistant.pantrySurface.sortKindAsc")}</option>
              <option value="expiresAsc">{translate("assistant.pantrySurface.sortExpiresAsc")}</option>
              <option value="expiresDesc">{translate("assistant.pantrySurface.sortExpiresDesc")}</option>
            </select>
          </div>
        </div>
      </div>
      {filteredSortedRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{translate("assistant.pantrySurface.emptyFiltered")}</p>
      ) : (
        <ul className="flex max-h-[min(50vh,28rem)] flex-col gap-2 overflow-y-auto pr-1">
          {filteredSortedRows.map((row) => (
            <li
              key={row.id}
              className="rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm"
            >
              <div className="font-medium leading-snug">{row.displayName}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>{translate(`pantry.kind.${row.itemKind}`)}</span>
                <span>{translate(`pantry.storage.${row.storageLocation}`)}</span>
                <span>
                  {translate("pantry.quantityLabel")}: {row.quantity}
                </span>
                {row.expiresOn ? (
                  <span>
                    {translate("pantry.expiresLabel")}: {row.expiresOn}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
