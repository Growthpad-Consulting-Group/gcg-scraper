import GenericKeywordTable from "./GenericKeywordTable";

export default function BaseKeywordsTable(props: { keywords: any[]; setKeywords: any; mode: "light" | "dark" }) {
  return <GenericKeywordTable title="Base Keywords" apiEndpoint="/api/base-keywords" keywordKey="keyword" {...props} />;
}
