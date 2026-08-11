// Standard country names for normalizing the free-text `location` extraction produces (e.g.
// "Nairobi, Kenya", "Accra, Ghana", "Addis Ababa") into a single clean country per tender. The
// app's own `countries` DB table is Africa-scoped by original design (54 countries), but tenders
// now come from global aggregators (UNDP, World Bank, AfDB, DevelopmentAid) that can return any
// country, so this list needs to be comprehensive, not just African.
//
// Sorted longest-first at use time so "Guinea-Bissau" matches before the substring "Guinea",
// and "Democratic Republic of the Congo" before "Congo".
export const WORLD_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina",
  "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
  "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
  "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia",
  "Comoros", "Democratic Republic of the Congo", "Republic of the Congo", "Congo", "Costa Rica",
  "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti",
  "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia",
  "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea-Bissau", "Guinea",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives",
  "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania",
  "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia",
  "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste",
  "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkiye", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

// Common aliases/short forms that show up in extracted text but aren't the canonical name above.
const ALIASES: Record<string, string> = {
  usa: "United States",
  "u.s.a.": "United States",
  "u.s.": "United States",
  uk: "United Kingdom",
  uae: "United Arab Emirates",
  drc: "Democratic Republic of the Congo",
  "ivory coast": "Cote d'Ivoire",
  "cote divoire": "Cote d'Ivoire",
  "republic of korea": "South Korea",
  "korea, republic of": "South Korea",
  "dprk": "North Korea",
  "czechia": "Czech Republic",
  "swaziland": "Eswatini",
  "burma": "Myanmar",
};

const SORTED_NAMES = [...WORLD_COUNTRIES].sort((a, b) => b.length - a.length);
const SORTED_ALIASES = Object.keys(ALIASES).sort((a, b) => b.length - a.length);

// Task-level `countries` filters accept region labels ("East Africa", "West Africa") alongside
// specific country names — a tender's own location is always a specific country, so region
// filters need expanding to their member countries before comparison.
const REGIONS: Record<string, string[]> = {
  "east africa": ["Kenya", "Uganda", "Tanzania", "Rwanda", "Burundi", "South Sudan", "Ethiopia", "Somalia", "Djibouti", "Eritrea"],
  "west africa": [
    "Ghana", "Nigeria", "Senegal", "Cote d'Ivoire", "Mali", "Burkina Faso", "Benin", "Togo",
    "Sierra Leone", "Liberia", "Guinea", "Guinea-Bissau", "Gambia", "Niger", "Cabo Verde", "Mauritania",
  ],
};

/** Expands a task's configured `countries` filter (which may mix specific countries with region
 * labels like "East Africa") into a flat, deduped list of specific country names to compare a
 * tender's own normalized country against. */
export function expandCountryFilter(countries: string[]): string[] {
  const expanded = countries.flatMap((c) => REGIONS[c.trim().toLowerCase()] ?? [c.trim()]);
  return [...new Set(expanded)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pulls a canonical country name out of free-text location extraction ("Nairobi, Kenya" ->
 * "Kenya"). Longest-name-first avoids "Guinea" matching inside "Guinea-Bissau", or "Congo"
 * swallowing "Democratic Republic of the Congo". Returns null when nothing recognizable is
 * found — regions like "East Africa" or vague text aren't a country and are left unset rather
 * than guessing. */
export function normalizeCountry(location: string | null | undefined): string | null {
  if (!location) return null;
  const trimmed = location.trim();
  if (!trimmed) return null;

  for (const alias of SORTED_ALIASES) {
    if (new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(trimmed)) return ALIASES[alias];
  }
  for (const name of SORTED_NAMES) {
    if (new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(trimmed)) return name;
  }
  return null;
}
