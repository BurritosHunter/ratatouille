import { auth } from "@/auth";
import { recipesToToolRows } from "@/lib/ai/recipe-tool-rows";
import { listRecipes } from "@/lib/data/recipes";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = Number.parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const summaries = await listRecipes(userId);
  return NextResponse.json({ recipes: recipesToToolRows(summaries) });
}
