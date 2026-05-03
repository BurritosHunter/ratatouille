import { auth } from "@/auth";
import { DEFAULT_ASSISTANT_MOCK_SCENARIO } from "@/lib/assistant-mock-ai-preference";
import { shouldUseRatatouilleMockAi } from "@/lib/ai/ratatouille-mock-language-model";

export async function GET() {
  if (process.env.NODE_ENV === "production") { return new Response(null, { status: 404 }); }

  const session = await auth();
  if (!session?.user?.id) { return new Response("Unauthorized", { status: 401 }); }

  return Response.json({
    defaultUseMock: shouldUseRatatouilleMockAi(),
    defaultMockScenario: DEFAULT_ASSISTANT_MOCK_SCENARIO,
  });
}
