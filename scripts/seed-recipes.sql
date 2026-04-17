-- Seed 10 sample recipes. Ingredient names must match your `ingredients` catalog for the same user.
-- Measurements are in `recipe_ingredients.quantity_note`; `recipes.ingredients` mirrors the app’s
-- display format (each line: "quantity_note name", same as formatIngredientsDisplay).
--
-- Replace 1 with your `users.id` in both places below (user_id on recipes and ingredients join).

BEGIN;

-- 1. Tomato Garlic Pasta
WITH new_recipe AS (
  INSERT INTO recipes (user_id, title, ingredients, instructions, main_image_url, main_image_data, main_image_mime)
  VALUES (
    1,
    'Tomato Garlic Pasta',
    E'400 g Pasta\n2 cups Tomato Sauce\n3 cloves Garlic\n2 tbsp Extra Virgin Olive Oil\n1/2 cup Basil',
    $inst$1. Bring a large pot of salted water to a boil and cook the pasta until al dente.
2. In a saucepan, warm the tomato sauce with minced garlic and torn basil.
3. Drain the pasta, toss with the sauce and a drizzle of olive oil, and serve.
$inst$,
    NULL, NULL, NULL
  )
  RETURNING id
)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, sort_order, quantity_note)
SELECT new_recipe.id, ingredient_row.id, ordering.sort_order, ordering.quantity_note
FROM new_recipe
CROSS JOIN (VALUES
  (0, 'Pasta', '400 g'),
  (1, 'Tomato Sauce', '2 cups'),
  (2, 'Garlic', '3 cloves'),
  (3, 'Extra Virgin Olive Oil', '2 tbsp'),
  (4, 'Basil', '1/2 cup')
) AS ordering(sort_order, ingredient_name, quantity_note)
INNER JOIN ingredients AS ingredient_row
  ON ingredient_row.user_id = 1 AND ingredient_row.name = ordering.ingredient_name AND ingredient_row.deleted_at IS NULL;

-- 2. Greek Salad Bowl
WITH new_recipe AS (
  INSERT INTO recipes (user_id, title, ingredients, instructions, main_image_url, main_image_data, main_image_mime)
  VALUES (
    1,
    'Greek Salad Bowl',
    E'1 head Lettuce\n1 medium Cucumber\n2 medium Tomato\n150 g Feta Cheese\n1/2 cup Olive\n1 Lemon',
    $inst$1. Chop the lettuce, cucumber, and tomato into bite-sized pieces.
2. Combine in a bowl with olives and crumbled feta.
3. Squeeze lemon over the top and toss gently before serving.
$inst$,
    NULL, NULL, NULL
  )
  RETURNING id
)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, sort_order, quantity_note)
SELECT new_recipe.id, ingredient_row.id, ordering.sort_order, ordering.quantity_note
FROM new_recipe
CROSS JOIN (VALUES
  (0, 'Lettuce', '1 head'),
  (1, 'Cucumber', '1'),
  (2, 'Tomato', '2 medium'),
  (3, 'Feta Cheese', '150 g'),
  (4, 'Olive', '1/2 cup'),
  (5, 'Lemon', '1')
) AS ordering(sort_order, ingredient_name, quantity_note)
INNER JOIN ingredients AS ingredient_row
  ON ingredient_row.user_id = 1 AND ingredient_row.name = ordering.ingredient_name AND ingredient_row.deleted_at IS NULL;

-- 3. Honey Banana Oatmeal
WITH new_recipe AS (
  INSERT INTO recipes (user_id, title, ingredients, instructions, main_image_url, main_image_data, main_image_mime)
  VALUES (
    1,
    'Honey Banana Oatmeal',
    E'1 cup Quick Oats\n2 cups Milk\n2 tbsp Honey\n1 Banana',
    $inst$1. Heat the milk in a small pot until steaming.
2. Stir in the oats and cook until thickened to your liking.
3. Top with sliced banana and a drizzle of honey.
$inst$,
    NULL, NULL, NULL
  )
  RETURNING id
)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, sort_order, quantity_note)
SELECT new_recipe.id, ingredient_row.id, ordering.sort_order, ordering.quantity_note
FROM new_recipe
CROSS JOIN (VALUES
  (0, 'Quick Oats', '1 cup'),
  (1, 'Milk', '2 cups'),
  (2, 'Honey', '2 tbsp'),
  (3, 'Banana', '1')
) AS ordering(sort_order, ingredient_name, quantity_note)
INNER JOIN ingredients AS ingredient_row
  ON ingredient_row.user_id = 1 AND ingredient_row.name = ordering.ingredient_name AND ingredient_row.deleted_at IS NULL;

-- 4. Chicken and Broccoli Rice
WITH new_recipe AS (
  INSERT INTO recipes (user_id, title, ingredients, instructions, main_image_url, main_image_data, main_image_mime)
  VALUES (
    1,
    'Chicken and Broccoli Rice',
    E'500 g Chicken\n1 head Broccoli\n3 tbsp Soy Sauce\n1 tbsp Ginger\n2 cloves Garlic\n1 cup White Rice',
    $inst$1. Cook the white rice until fluffy and keep warm.
2. Stir-fry chicken until golden, then add broccoli, garlic, and ginger.
3. Add soy sauce, toss until the broccoli is tender-crisp, and serve over rice.
$inst$,
    NULL, NULL, NULL
  )
  RETURNING id
)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, sort_order, quantity_note)
SELECT new_recipe.id, ingredient_row.id, ordering.sort_order, ordering.quantity_note
FROM new_recipe
CROSS JOIN (VALUES
  (0, 'Chicken', '500 g'),
  (1, 'Broccoli', '1 head'),
  (2, 'Soy Sauce', '3 tbsp'),
  (3, 'Ginger', '1 tbsp'),
  (4, 'Garlic', '2 cloves'),
  (5, 'White Rice', '1 cup')
) AS ordering(sort_order, ingredient_name, quantity_note)
INNER JOIN ingredients AS ingredient_row
  ON ingredient_row.user_id = 1 AND ingredient_row.name = ordering.ingredient_name AND ingredient_row.deleted_at IS NULL;

-- 5. Beef Tacos
WITH new_recipe AS (
  INSERT INTO recipes (user_id, title, ingredients, instructions, main_image_url, main_image_data, main_image_mime)
  VALUES (
    1,
    'Beef Tacos',
    E'500 g Ground Beef\n8 small Tortillas\n1 cup shredded Cheddar Cheese\n2 cups shredded Lettuce\n2 medium Tomato\n1/2 cup Sour Cream',
    $inst$1. Brown the ground beef in a skillet, seasoning as you like.
2. Warm the tortillas until pliable.
3. Fill with beef, lettuce, tomato, cheese, and a dollop of sour cream.
$inst$,
    NULL, NULL, NULL
  )
  RETURNING id
)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, sort_order, quantity_note)
SELECT new_recipe.id, ingredient_row.id, ordering.sort_order, ordering.quantity_note
FROM new_recipe
CROSS JOIN (VALUES
  (0, 'Ground Beef', '500 g'),
  (1, 'Tortillas', '8 small'),
  (2, 'Cheddar Cheese', '1 cup shredded'),
  (3, 'Lettuce', '2 cups shredded'),
  (4, 'Tomato', '2 medium'),
  (5, 'Sour Cream', '1/2 cup')
) AS ordering(sort_order, ingredient_name, quantity_note)
INNER JOIN ingredients AS ingredient_row
  ON ingredient_row.user_id = 1 AND ingredient_row.name = ordering.ingredient_name AND ingredient_row.deleted_at IS NULL;

-- 6. Salmon Avocado Bowl
WITH new_recipe AS (
  INSERT INTO recipes (user_id, title, ingredients, instructions, main_image_url, main_image_data, main_image_mime)
  VALUES (
    1,
    'Salmon Avocado Bowl',
    E'2 fillets Salmon\n1 cup Brown Rice\n1 Avocado\n1/2 Cucumber\n2 tbsp Soy Sauce',
    $inst$1. Cook the brown rice and let it cool slightly.
2. Pan-sear or bake the salmon until cooked through.
3. Flake the salmon over rice with cucumber and avocado, then finish with soy sauce.
$inst$,
    NULL, NULL, NULL
  )
  RETURNING id
)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, sort_order, quantity_note)
SELECT new_recipe.id, ingredient_row.id, ordering.sort_order, ordering.quantity_note
FROM new_recipe
CROSS JOIN (VALUES
  (0, 'Salmon', '2 fillets'),
  (1, 'Brown Rice', '1 cup'),
  (2, 'Avocado', '1'),
  (3, 'Cucumber', '1/2'),
  (4, 'Soy Sauce', '2 tbsp')
) AS ordering(sort_order, ingredient_name, quantity_note)
INNER JOIN ingredients AS ingredient_row
  ON ingredient_row.user_id = 1 AND ingredient_row.name = ordering.ingredient_name AND ingredient_row.deleted_at IS NULL;

-- 7. Margherita Pizza
WITH new_recipe AS (
  INSERT INTO recipes (user_id, title, ingredients, instructions, main_image_url, main_image_data, main_image_mime)
  VALUES (
    1,
    'Margherita Pizza',
    E'1 ball Pizza Dough\n1/2 cup Tomato Sauce\n200 g Mozzarella\n1/4 cup Basil',
    $inst$1. Stretch or roll the dough and place on a prepared baking surface.
2. Spread tomato sauce, add mozzarella, and bake in a hot oven until the crust is golden.
3. Top with fresh basil just before serving.
$inst$,
    NULL, NULL, NULL
  )
  RETURNING id
)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, sort_order, quantity_note)
SELECT new_recipe.id, ingredient_row.id, ordering.sort_order, ordering.quantity_note
FROM new_recipe
CROSS JOIN (VALUES
  (0, 'Pizza Dough', '1 ball'),
  (1, 'Tomato Sauce', '1/2 cup'),
  (2, 'Mozzarella', '200 g'),
  (3, 'Basil', '1/4 cup')
) AS ordering(sort_order, ingredient_name, quantity_note)
INNER JOIN ingredients AS ingredient_row
  ON ingredient_row.user_id = 1 AND ingredient_row.name = ordering.ingredient_name AND ingredient_row.deleted_at IS NULL;

-- 8. Vegetable Soup
WITH new_recipe AS (
  INSERT INTO recipes (user_id, title, ingredients, instructions, main_image_url, main_image_data, main_image_mime)
  VALUES (
    1,
    'Vegetable Soup',
    E'6 cups Vegetable Broth\n2 Carrot\n2 stalks Celery\n1 Onion\n2 medium Potato\n2 tbsp Tomato Paste',
    $inst$1. Sauté onion, carrot, and celery until softened.
2. Add potato, tomato paste, and broth; bring to a simmer.
3. Cook until the vegetables are tender, then adjust seasoning and serve hot.
$inst$,
    NULL, NULL, NULL
  )
  RETURNING id
)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, sort_order, quantity_note)
SELECT new_recipe.id, ingredient_row.id, ordering.sort_order, ordering.quantity_note
FROM new_recipe
CROSS JOIN (VALUES
  (0, 'Vegetable Broth', '6 cups'),
  (1, 'Carrot', '2'),
  (2, 'Celery', '2 stalks'),
  (3, 'Onion', '1'),
  (4, 'Potato', '2 medium'),
  (5, 'Tomato Paste', '2 tbsp')
) AS ordering(sort_order, ingredient_name, quantity_note)
INNER JOIN ingredients AS ingredient_row
  ON ingredient_row.user_id = 1 AND ingredient_row.name = ordering.ingredient_name AND ingredient_row.deleted_at IS NULL;

-- 9. Lemon Parmesan Salad
WITH new_recipe AS (
  INSERT INTO recipes (user_id, title, ingredients, instructions, main_image_url, main_image_data, main_image_mime)
  VALUES (
    1,
    'Lemon Parmesan Salad',
    E'1 head Lettuce\n1/2 cup shaved Parmesan Cheese\n1 Lemon\n1 clove Garlic',
    $inst$1. Whisk lemon juice with finely minced garlic for a simple dressing.
2. Toss chopped lettuce with shaved parmesan.
3. Dress the salad and serve right away.
$inst$,
    NULL, NULL, NULL
  )
  RETURNING id
)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, sort_order, quantity_note)
SELECT new_recipe.id, ingredient_row.id, ordering.sort_order, ordering.quantity_note
FROM new_recipe
CROSS JOIN (VALUES
  (0, 'Lettuce', '1 head'),
  (1, 'Parmesan Cheese', '1/2 cup shaved'),
  (2, 'Lemon', '1'),
  (3, 'Garlic', '1 clove')
) AS ordering(sort_order, ingredient_name, quantity_note)
INNER JOIN ingredients AS ingredient_row
  ON ingredient_row.user_id = 1 AND ingredient_row.name = ordering.ingredient_name AND ingredient_row.deleted_at IS NULL;

-- 10. Berry Yogourt Smoothie
WITH new_recipe AS (
  INSERT INTO recipes (user_id, title, ingredients, instructions, main_image_url, main_image_data, main_image_mime)
  VALUES (
    1,
    'Berry Yogourt Smoothie',
    E'1 cup Yogourt\n1 cup Blueberries\n1 Banana\n1/2 cup Milk',
    $inst$1. Add yogourt, blueberries, banana, and milk to a blender.
2. Blend until smooth and pour into glasses.
$inst$,
    NULL, NULL, NULL
  )
  RETURNING id
)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, sort_order, quantity_note)
SELECT new_recipe.id, ingredient_row.id, ordering.sort_order, ordering.quantity_note
FROM new_recipe
CROSS JOIN (VALUES
  (0, 'Yogourt', '1 cup'),
  (1, 'Blueberries', '1 cup'),
  (2, 'Banana', '1'),
  (3, 'Milk', '1/2 cup')
) AS ordering(sort_order, ingredient_name, quantity_note)
INNER JOIN ingredients AS ingredient_row
  ON ingredient_row.user_id = 1 AND ingredient_row.name = ordering.ingredient_name AND ingredient_row.deleted_at IS NULL;

COMMIT;
