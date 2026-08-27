"use client";

import PageHeader from "@/shared/ui/PageHeader";
import KeywordListPanel from "@/features/settings/components/KeywordListPanel";
import RetentionSettingsPanel from "@/features/settings/components/RetentionSettingsPanel";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <PageHeader
        title="Settings"
        description="Business-tunable knobs — keyword libraries and retention/timing windows. API keys and other secrets are configured via environment variables, not here."
        icon="solar:settings-broken"
      />

      <RetentionSettingsPanel />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <KeywordListPanel
          icon="solar:hashtag-broken"
          title="Keyword Library"
          description="The default relevance filter used across scheduled tasks and ad-hoc scans when no task-specific keywords are set."
          listUrl="/api/search-terms"
          itemKey="term"
          responseKey="search_terms"
        />

        <KeywordListPanel
          icon="mdi:linkedin"
          title="LinkedIn Search Phrases"
          description="Default search phrases for LinkedIn Tenders tasks when a task hasn't customized its own list."
          listUrl="/api/linkedin-search-phrases"
          itemKey="phrase"
          responseKey="linkedin_search_phrases"
        />
      </div>
    </div>
  );
}
