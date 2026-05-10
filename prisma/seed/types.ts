export type SeedIngredient = {
  name: string;
  category?: string;
  shelfLifePreset?: string;
};

export type SeedRecipeLine = {
  sortOrder: number;
  ingredientName: string;
  quantityNote: string;
};

export type SeedRecipe = {
  title: string;
  ingredientsText: string;
  instructions: string;
  lines: SeedRecipeLine[];
};

export type SeedData = {
  userId: number;
  ingredients: SeedIngredient[];
  recipes: SeedRecipe[];
};
