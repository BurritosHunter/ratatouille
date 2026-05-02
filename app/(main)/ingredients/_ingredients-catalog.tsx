"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"

import type { IngredientsSortMode } from "./_list-editor"
import { IngredientsEditor } from "./_list-editor"
import type { CategoryShelfLifeDefaultsMap } from "@/lib/data/ingredient-category-shelf-defaults"
import type { Ingredient } from "@/lib/models/ingredient"
import { inputVariants } from "@/components/ui/input"
import { cn } from "@/lib/helpers/utils"

type Props = {
  title: string
  initial: Ingredient[]
  categoryShelfDefaults: CategoryShelfLifeDefaultsMap
}

export function IngredientsCatalog({ title, initial, categoryShelfDefaults }: Props) {
  const { t } = useTranslation()
  const [sortMode, setSortMode] = useState<IngredientsSortMode>("name_az")

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto mb-30">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h1 className="font-large">{title}</h1>
        <select
          className={cn(inputVariants({ variant: "default" }), "w-full min-w-0 sm:w-[11rem] shrink-0")}
          value={sortMode}
          onChange={(event) => {
            const value = event.target.value
            if (value === "name_az" || value === "category") setSortMode(value)
          }}
          aria-label={t("ingredients.sortAria")}
        >
          <option value="name_az">{t("ingredients.sortNameAz")}</option>
          <option value="category">{t("ingredients.sortByCategory")}</option>
        </select>
      </div>
      <IngredientsEditor
        initial={initial}
        categoryShelfDefaults={categoryShelfDefaults}
        sortMode={sortMode}
      />
    </div>
  )
}
