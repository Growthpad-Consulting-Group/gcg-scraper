import GenericKeywordTable from "./GenericKeywordTable";

export default function RelevantKeywordsTable(props: { keywords: any[]; setKeywords: any; mode: "light" | "dark" }) {
  return <GenericKeywordTable title="Relevant Keywords" apiEndpoint="/api/relevant-keywords" keywordKey="keyword" {...props} />;
}
