import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

/** Load env before `../client` (same order as prisma.config.ts). */
const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
dotenv.config({ path: path.join(projectRoot, ".env.local") });
dotenv.config({ path: path.join(projectRoot, ".env") });
