export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Builds a friendly, shareable tender URL. The numeric id (leading segment) is what's actually
 * looked up — the slug is cosmetic and any/no slug after it resolves the same tender. */
export function tenderHref(tender: { id: string | number; title: string }): string {
  const slug = slugify(tender.title || "");
  return slug ? `/tenders/${tender.id}-${slug}` : `/tenders/${tender.id}`;
}

/** Extracts the numeric id from a route segment like "123-some-tender-title" or bare "123". */
export function parseTenderIdFromSegment(segment: string): string {
  const match = segment.match(/^\d+/);
  return match ? match[0] : segment;
}
