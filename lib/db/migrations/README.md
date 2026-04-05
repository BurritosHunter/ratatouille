# Database migrations

Run **`001_recipes_table.sql`** in the Neon SQL editor (or your Postgres client) on the database used by `DATABASE_URL`.
That script creates the `recipes` table. It expects a **`users`** table to already exist (from Auth.js / `@auth/pg-adapter` setup).
