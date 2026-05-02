# Database setup (fresh Postgres)

Scripts for building the **Ratatouille schema on an empty database** (not incremental migrations).  

Run **`001` → `002` → `003`** exactly once against the Postgres instance behind `DATABASE_URL`, in order.

| Script | Contents |
|--------|----------|
| **`001_recipes_table.sql`** | `recipes` table and indexes — requires **`users`** (from Auth.js / `@auth/pg-adapter`). |
| **`002_ingredients_catalog_and_defaults.sql`** | `ingredients` (category + mandatory `shelf_life_preset`), `recipe_ingredients`, `ingredient_category_shelf_defaults` + seed rows. Requires **`users`** + **`recipes`**. |
| **`003_pantry_inventory.sql`** | `pantry_inventory` — requires **`users`**, **`ingredients`**, **`recipes`**. |

If tables already exist, these scripts will error; reset the database or trim statements before re-running.
