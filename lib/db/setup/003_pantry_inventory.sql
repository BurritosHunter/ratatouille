-- Fresh database setup script 003.
-- Prerequisites: `users`, `recipes`, and catalog from 001–002 (`ingredients`, `recipes` for FK references).

CREATE TABLE pantry_inventory (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  storage_location   TEXT NOT NULL
    CHECK (storage_location IN ('fridge', 'pantry', 'storage', 'freezer')),
  item_kind          TEXT NOT NULL
    CHECK (item_kind IN ('ingredient', 'meal', 'custom')),
  ingredient_id      BIGINT NULL REFERENCES ingredients (id) ON DELETE CASCADE,
  recipe_id          BIGINT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  custom_label       TEXT NULL,
  quantity           NUMERIC(12, 4) NOT NULL DEFAULT 1
    CHECK (quantity > 0),
  expires_on         DATE NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pantry_inventory_link_chk CHECK (
    (
      item_kind = 'ingredient'
      AND ingredient_id IS NOT NULL
      AND recipe_id IS NULL
      AND custom_label IS NULL
    )
    OR (
      item_kind = 'meal'
      AND recipe_id IS NOT NULL
      AND ingredient_id IS NULL
      AND custom_label IS NULL
    )
    OR (
      item_kind = 'custom'
      AND custom_label IS NOT NULL
      AND btrim(custom_label) <> ''
      AND ingredient_id IS NULL
      AND recipe_id IS NULL
    )
  )
);

CREATE INDEX pantry_inventory_user_location_idx
  ON pantry_inventory (user_id, storage_location);

CREATE INDEX pantry_inventory_user_created_idx
  ON pantry_inventory (user_id, created_at DESC);
