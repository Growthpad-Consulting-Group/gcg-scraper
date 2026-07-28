import GenericKeywordTable from "./GenericKeywordTable";

export default function SearchTermsTable(props: { keywords: any[]; setKeywords: any; mode: "light" | "dark" }) {
  return <GenericKeywordTable title="Search Terms" apiEndpoint="/api/search-terms" keywordKey="term" {...props} />;
}
