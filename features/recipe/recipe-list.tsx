import { RecipeListRowLink } from "@/components/molecules/recipe-list-row-link";
import type { RecipeListLinkItem } from "@/lib/helpers/recipe-list-link-items";

type Props = { recipes: readonly RecipeListLinkItem[]; };

export function RecipeList({ recipes }: Props) {
  return (
    <ul className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      {recipes.map((recipe) => (
        <li key={recipe.recipeId}>
          <RecipeListRowLink recipeId={recipe.recipeId} title={recipe.title} thumbSrc={recipe.thumbSrc} />
        </li>
      ))}
    </ul>
  );
}
