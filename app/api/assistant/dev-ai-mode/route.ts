import { auth } from "@/auth";
import { DEFAULT_ASSISTANT_MOCK_SCENARIO } from "@/lib/assistant-mock/scenario";
import { shouldUseRatatouilleMockAi } from "@/lib/assistant-mock/mock-language-model";

export async function GET() {
  if (process.env.NODE_ENV === "production") { return new Response(null, { status: 404 }); }

  const session = await auth();
  if (!session?.user?.id) { return new Response("Unauthorized", { status: 401 }); }

  return Response.json({
    defaultUseMock: shouldUseRatatouilleMockAi(),
    defaultMockScenario: DEFAULT_ASSISTANT_MOCK_SCENARIO,
  });
}
