export type SearchTerm = { id: number; term: string };
export type BaseKeyword = { id: number; keyword: string };
export type Country = { id: number; country_name: string };

export type ScrapeStatus = "idle" | "running" | "complete" | "canceled" | "error";

export type ScrapeSummary = {
  urlsVisited: number;
  timeTaken: number;
  openTenders: number;
  closedTenders: number;
  totalTenders: number;
  startTime: number | null;
};
