import KeywordListPanel from "@/features/settings/components/KeywordListPanel";
import SearchTermPerformancePanel from "@/features/settings/components/SearchTermPerformancePanel";

export default function KeywordsPage() {
  return (
    <div className="flex flex-col gap-4">
      <KeywordListPanel
        icon="solar:hashtag-broken"
        title="Keyword Library"
        description="The default relevance filter used across scheduled tasks and ad-hoc scans when no task-specific keywords are set."
        listUrl="/api/search-terms"
        itemKey="term"
        responseKey="search_terms"
      />
      <SearchTermPerformancePanel />
    </div>
  );
}
