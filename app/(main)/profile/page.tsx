import { AssistantAccessSwitch } from "@/components/molecules/assistant-access-switch"
import { AssistantMockAiSwitch } from "@/components/molecules/assistant-mock-ai-switch"
import { AssistantMockScenarioSelect } from "./_assistant-mock-scenario-select"
import { ThemeToggle } from "@/components/theme-toggle"
import { requireUserId } from "@/lib/auth/auth-user"
import { getServerT } from "@/lib/i18n/server"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  await requireUserId("/profile")
  const t = getServerT()

  return (
    <div className="max-w-header">
      <div className="mx-auto mb-30 flex w-full max-w-2xl flex-col gap-6">
        <h1 className="font-large">{t("profile.title")}</h1>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t("profile.theme")}</p>
          <ThemeToggle />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">{t("profile.assistantHeading")}</h2>
          <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
            <AssistantAccessSwitch id="profile-assistant-access-switch" />
            <AssistantMockAiSwitch id="profile-assistant-mock-ai-switch" />
            <AssistantMockScenarioSelect id="profile-assistant-mock-scenario" />
          </div>
        </div>
      </div>
    </div>
  )
}
