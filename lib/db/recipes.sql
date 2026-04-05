CREATE TABLE recipes (
  id           BIGSERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  ingredients  TEXT NOT NULL,
  instructions TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ NULL
);

CREATE INDEX recipes_user_id_idx ON recipes (user_id);
CREATE INDEX recipes_user_active_idx ON recipes (user_id) WHERE deleted_at IS NULL;