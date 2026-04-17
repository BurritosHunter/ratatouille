import { RecipeImagePatchAction } from "../constants"

export type RecipeImagePatch =
  | { action: RecipeImagePatchAction.NoChange }
  | { action: RecipeImagePatchAction.ClearAll }
  | { action: RecipeImagePatchAction.SetFile; buffer: Buffer; mime: string }
  | { action: RecipeImagePatchAction.SetExternalUrl; url: string }
  | { action: RecipeImagePatchAction.ClearExternalUrlOnly }

export type Recipe = {
  id: number
  title: string
  ingredients: string
  instructions: string
  mainImageUrl: string | null
  hasStoredImage: boolean
}

export type RecipeSummary = {
  id: number
  title: string
  mainImageUrl: string | null
  hasStoredImage: boolean
}
