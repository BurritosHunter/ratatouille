import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../client";
import { seedIngredientsTable } from "./seeds/ingredients";
import { seedRecipesTables } from "./seeds/recipes";
import type { SeedData } from "./types";

type SeedTarget = "ingredients" | "recipes";

function printSeedHelp(): void {
  console.log(`
Seeds data from prisma/seed/seeds/seed-data.json for seedData.userId.

Usage:
  npm run db:seed
  npx prisma db seed
  npx tsx prisma/seed/index.ts
  npm run db:seed -- --only <target>   (the \"--\" forwards args to tsx)

Options:
  --only ingredients   Replace ingredients only. Clears this user's pantry + recipes first (FKs).
  --only recipes       Replace recipes only. Requires ingredient names to already match seed data.
  --only all           Ingredients then recipes (default if --only is omitted).
  -h, --help           Show this text.

Examples:
  npm run db:seed -- --only ingredients
  npm run db:seed -- --only recipes
  prisma db seed -- --only recipes
`);
}

function seedArgv(argv: string[]): string[] {
  const dropped = argv.slice(2);
  while (dropped.length > 0 && !dropped[0].startsWith("-")) {
    dropped.shift();
  }
  return dropped;
}

function parseSeedTargets(argv: string[]): Set<SeedTarget> {
  const args = seedArgv(argv);
  const targets = new Set<SeedTarget>();

  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    if (argument === "-h" || argument === "--help") {
      printSeedHelp();
      process.exit(0);
    }
    if (argument === "--only") {
      const value = args[i + 1];
      if (value === undefined) {
        throw new Error("--only requires a value: ingredients | recipes | all");
      }
      if (value === "all") {
        targets.add("ingredients");
        targets.add("recipes");
      } else if (value === "ingredients") {
        targets.add("ingredients");
      } else if (value === "recipes") {
        targets.add("recipes");
      } else {
        throw new Error(`Unknown --only value: ${value}. Use ingredients, recipes, or all.`);
      }
      i += 1;
      continue;
    }
    if (argument.startsWith("-")) {
      throw new Error(`Unknown flag: ${argument}`);
    }
  }

  if (targets.size === 0) {
    targets.add("ingredients");
    targets.add("recipes");
  }

  return targets;
}

async function main() {
  const seedDir = path.dirname(fileURLToPath(import.meta.url));
  const payloadPath = path.join(seedDir, "seeds", "seed-data.json");
  const sampleData = JSON.parse(fs.readFileSync(payloadPath, "utf8")) as SeedData;

  const userId = sampleData.userId;
  const userExists = await prisma.user.findUnique({ where: { id: userId } });
  if (!userExists) {
    throw new Error(`No user with id=${userId}. Create an account first or edit prisma/seed/seeds/seed-data.json userId / SEED_USER_ID.`);
  }

  const targets = parseSeedTargets(process.argv);

  let ingredientCount = 0;
  let recipeCount = 0;

  if (targets.has("ingredients")) {
    ingredientCount = await seedIngredientsTable(prisma, userId, sampleData.ingredients);
  }
  if (targets.has("recipes")) {
    recipeCount = await seedRecipesTables(prisma, userId, sampleData.recipes);
  }

  const parts: string[] = [];
  if (targets.has("ingredients")) {
    parts.push(`${ingredientCount} ingredients`);
  }
  if (targets.has("recipes")) {
    parts.push(`${recipeCount} recipes`);
  }
  console.log(`Database seeded successfully (user ${userId}): ${parts.join(", ")}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
