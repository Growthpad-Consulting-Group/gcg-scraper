import KeywordListPanel from "@/features/settings/components/KeywordListPanel";

export default function LinkedInPage() {
  return (
    <KeywordListPanel
      icon="mdi:linkedin"
      title="LinkedIn Search Phrases"
      description="Default search phrases for LinkedIn Tenders tasks when a task hasn't customized its own list."
      listUrl="/api/linkedin-search-phrases"
      itemKey="phrase"
      responseKey="linkedin_search_phrases"
    />
  );
}
