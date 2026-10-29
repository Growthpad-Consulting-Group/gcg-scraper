import { describe, expect, it } from "vitest";
import { matchesTopicPhrases, topicKeywordsFromQuery } from "./sourceConfigs";

const contactCentreQueries = [
  '"request for proposal" BPO contact centre and customer experience outsourcing Kenya',
  '"request for proposal" sales outsourcing lead generation and SDR services Kenya',
  '"request for proposal" employer of record recruitment and workforce outsourcing services Kenya',
];

const rwandaFalsePositives = [
  "Request for Proposal for Purchase of Phytosanitary Products at Rwanda Ultimate Golf Course",
  "Request for Quotation for Supply of PPEs and IPC Supplies at WHO Country Office for Rwanda",
  "Tender Notice for Supply of School Desks in Nyaruguru District at ActionAid Rwanda",
  "Tender Notice for Procurement and Distribution of Vegetable Seeds to CJP Rightsholders in Gisagara District",
  "Request for Proposal for Audit Services at Kinazi Cassava Plant Limited (KCP)",
];

const relevant = [
  "Request for Proposal for BPO contact centre and customer experience outsourcing",
  "RFP for sales outsourcing and lead generation",
  "Tender for recruitment and workforce outsourcing services",
];

const hits = (title: string, queries: string[]) =>
  matchesTopicPhrases({ title }, [...new Set(queries.flatMap(topicKeywordsFromQuery))]);

describe("topicKeywordsFromQuery", () => {
  it("drops intent words and place names, splits on and", () => {
    expect(topicKeywordsFromQuery(contactCentreQueries[0])).toEqual(["BPO contact centre", "customer experience outsourcing"]);
    expect(topicKeywordsFromQuery(contactCentreQueries[2])).toEqual(["employer of record recruitment", "workforce outsourcing"]);
  });

  it("keeps consultancy RFPs from the Oct 27 DevelopmentAid run", () => {
    const consultancy = [
      "Consultancy Services to Assess and Address the Policy, Regulatory and Inter",
      "Technical Assistance to Support the Securities and Exchange Commission of Nigeria",
      "Recruitment of a Consultancy to Conduct a Digital Market and Digital Skills",
    ];
    const consultancyQueries = ["\"request for proposal\" consultancy services capacity building and technical assistance Kenya"];
    for (const title of consultancy) expect(hits(title, consultancyQueries)).toBe(true);
  });

  it("rejects unrelated procurement from an allowed country", () => {
    for (const title of rwandaFalsePositives) expect(hits(title, contactCentreQueries)).toBe(false);
  });

  it("keeps tenders that match the query topic", () => {
    for (const title of relevant) expect(hits(title, contactCentreQueries)).toBe(true);
  });
});
