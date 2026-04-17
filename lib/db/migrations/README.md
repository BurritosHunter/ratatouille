# Database migrations

Run these in order in the Neon SQL editor (or your Postgres client) on the database used by `DATABASE_URL`:

1. **`001_recipes_table.sql`** — creates the `recipes` table. Expects a **`users`** table to already exist (from Auth.js / `@auth/pg-adapter` setup).
2. **`002_ingredients_and_recipe_ingredients.sql`** — creates `ingredients` and `recipe_ingredients` for the pantry and per-recipe lines.
