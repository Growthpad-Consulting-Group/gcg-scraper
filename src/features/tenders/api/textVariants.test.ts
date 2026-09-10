import { describe, it, expect } from "vitest";
import { normalizeSpellingVariants, expandAcronymVariants } from "./textVariants";
import { matchesKeywords, matchedKeywords } from "./sourceConfigs";

describe("normalizeSpellingVariants", () => {
  it("canonicalizes American spelling to the British form", () => {
    expect(normalizeSpellingVariants("program management")).toBe("programme management");
    expect(normalizeSpellingVariants("data optimization")).toBe("data optimisation");
  });

  it("leaves already-canonical text unchanged", () => {
    expect(normalizeSpellingVariants("programme management")).toBe("programme management");
  });

  it("doesn't touch unrelated words", () => {
    expect(normalizeSpellingVariants("consultancy services")).toBe("consultancy services");
  });
});

describe("expandAcronymVariants", () => {
  it("expands a full form to include its acronym", () => {
    expect(expandAcronymVariants("public relations")).toEqual(expect.arrayContaining(["public relations", "PR"]));
  });

  it("expands an acronym to include its full form", () => {
    expect(expandAcronymVariants("MEL")).toEqual(expect.arrayContaining(["MEL", "monitoring evaluation and learning"]));
  });

  it("returns just the term when it has no known variant", () => {
    expect(expandAcronymVariants("video production")).toEqual(["video production"]);
  });
});

describe("matchesKeywords with variants", () => {
  it("matches a British-spelled keyword against American-spelled tender text", () => {
    const tender = { title: "Program Management Consultant", description: null, category: null };
    expect(matchesKeywords(tender, ["programme coordination"])).toBe(false); // different phrase entirely, sanity check
    expect(matchesKeywords({ ...tender, title: "Programme Coordination Support" }, ["program coordination"])).toBe(true);
  });

  it("matches an acronym keyword against a tender using the full form", () => {
    const tender = { title: "Public Relations and Media Relations Services", description: null, category: null };
    expect(matchesKeywords(tender, ["PR"])).toBe(true);
  });

  it("matches a full-form keyword against a tender using the acronym", () => {
    const tender = { title: "MEL Framework Development", description: null, category: null };
    expect(matchesKeywords(tender, ["monitoring evaluation and learning"])).toBe(true);
  });
});

describe("matchedKeywords", () => {
  it("returns only the keywords that actually hit, as configured", () => {
    const tender = { title: "Consultancy for Monitoring and Evaluation of a Health Programme", description: null, category: null };
    expect(matchedKeywords(tender, ["monitoring and evaluation", "supply of vehicles", "health"])).toEqual([
      "monitoring and evaluation",
      "health",
    ]);
  });

  it("returns the keyword string as configured, not the variant found in the text", () => {
    const tender = { title: "MEL Framework Development", description: null, category: null };
    expect(matchedKeywords(tender, ["monitoring evaluation and learning"])).toEqual(["monitoring evaluation and learning"]);
  });

  it("is empty when no keyword filter is active", () => {
    const tender = { title: "Anything at all", description: null, category: null };
    expect(matchedKeywords(tender, [])).toEqual([]);
    expect(matchedKeywords(tender, null)).toEqual([]);
  });

  it("is empty when nothing matches", () => {
    const tender = { title: "Supply of office furniture", description: null, category: null };
    expect(matchedKeywords(tender, ["cybersecurity", "media relations"])).toEqual([]);
  });

  it("stays consistent with matchesKeywords", () => {
    const tender = { title: "Website redesign and hosting", description: null, category: null };
    expect(matchedKeywords(tender, ["website", "print"]).length > 0).toBe(matchesKeywords(tender, ["website", "print"]));
    expect(matchedKeywords(tender, ["print"]).length > 0).toBe(matchesKeywords(tender, ["print"]));
  });
});
