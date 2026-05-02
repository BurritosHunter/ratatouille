-- Fresh database setup script 002.
-- Prerequisites: `users` table; `recipes` from 001.

-- Per-user ingredient catalog rows (category + mandatory shelf-life preset; default preset is one year).
CREATE TABLE ingredients (
  id                BIGSERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'miscellaneous',
  shelf_life_preset TEXT NOT NULL DEFAULT '1_year',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ NULL,
  CONSTRAINT ingredients_category_check CHECK (
    category IN (
      'dairy',
      'pasta',
      'bread',
      'meat',
      'nut',
      'seed',
      'herb',
      'vegetable',
      'fruit',
      'miscellaneous'
    )
  ),
  CONSTRAINT ingredients_shelf_life_preset_allowed CHECK (
    shelf_life_preset IN (
      '3_days',
      '5_days',
      '7_days',
      '2_weeks',
      '1_month',
      '3_months',
      '6_months',
      '1_year'
    )
  )
);

CREATE UNIQUE INDEX ingredients_user_name_lower_unique
  ON ingredients (user_id, lower(btrim(name)))
  WHERE deleted_at IS NULL;

CREATE INDEX ingredients_user_active_idx
  ON ingredients (user_id)
  WHERE deleted_at IS NULL;

-- Recipe ingredient lines referencing the catalog.

CREATE TABLE recipe_ingredients (
  id             BIGSERIAL PRIMARY KEY,
  recipe_id      BIGINT NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  ingredient_id  BIGINT NOT NULL REFERENCES ingredients (id),
  sort_order     INTEGER NOT NULL,
  quantity_note  TEXT NULL,
  UNIQUE (recipe_id, sort_order)
);

CREATE INDEX recipe_ingredients_recipe_id_idx ON recipe_ingredients (recipe_id);
CREATE INDEX recipe_ingredients_ingredient_id_idx ON recipe_ingredients (ingredient_id);

-- App-wide defaults: when UI picks an ingredient category, shelf-life select is pre-filled from here.

CREATE TABLE ingredient_category_shelf_defaults (
  category                  TEXT PRIMARY KEY,
  default_shelf_life_preset TEXT NOT NULL,
  CONSTRAINT ingredient_category_shelf_defaults_category_check CHECK (
    category IN (
      'dairy',
      'pasta',
      'bread',
      'meat',
      'nut',
      'seed',
      'herb',
      'vegetable',
      'fruit',
      'miscellaneous'
    )
  ),
  CONSTRAINT ingredient_category_shelf_defaults_preset_check CHECK (
    default_shelf_life_preset IN (
      '3_days',
      '5_days',
      '7_days',
      '2_weeks',
      '1_month',
      '3_months',
      '6_months',
      '1_year'
    )
  )
);

INSERT INTO ingredient_category_shelf_defaults (category, default_shelf_life_preset) VALUES
  ('dairy', '2_weeks'),
  ('pasta', '5_days'),
  ('bread', '3_days'),
  ('meat', '3_days'),
  ('nut', '3_months'),
  ('seed', '1_year'),
  ('herb', '2_weeks'),
  ('vegetable', '2_weeks'),
  ('fruit', '5_days'),
  ('miscellaneous', '1_year');
