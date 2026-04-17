-- Ingredients catalog (per user) and recipe–ingredient lines.
-- Expects `users` and `recipes` tables (see 001_recipes_table.sql).

CREATE TABLE ingredients (
  id           BIGSERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX ingredients_user_name_lower_unique
  ON ingredients (user_id, lower(btrim(name)))
  WHERE deleted_at IS NULL;

CREATE INDEX ingredients_user_active_idx
  ON ingredients (user_id)
  WHERE deleted_at IS NULL;

CREATE TABLE recipe_ingredients (
  id              BIGSERIAL PRIMARY KEY,
  recipe_id       BIGINT NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  ingredient_id   BIGINT NOT NULL REFERENCES ingredients (id),
  sort_order      INTEGER NOT NULL,
  quantity_note   TEXT NULL,
  UNIQUE (recipe_id, sort_order)
);

CREATE INDEX recipe_ingredients_recipe_id_idx ON recipe_ingredients (recipe_id);
CREATE INDEX recipe_ingredients_ingredient_id_idx ON recipe_ingredients (ingredient_id);
