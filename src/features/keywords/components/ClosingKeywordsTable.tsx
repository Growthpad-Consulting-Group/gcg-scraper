import GenericKeywordTable from "./GenericKeywordTable";

export default function ClosingKeywordsTable(props: { keywords: any[]; setKeywords: any; mode: "light" | "dark" }) {
  return <GenericKeywordTable title="Closing Keywords" apiEndpoint="/api/closing-keywords" keywordKey="keyword" {...props} />;
}
