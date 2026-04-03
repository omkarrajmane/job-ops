import type { Job } from "@shared/types.js";

export interface ReadyPanelGoogleDorkLink {
  href: string;
  label: string;
  query: string;
}

function splitRawSkills(skills: string): string[] {
  return skills
    .split(/[,\n|]+/g)
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseTailoredSkills(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getKeywordTerms(job: Job): string[] {
  const employer = job.employer.trim().toLowerCase();
  const rawTerms = job.skills
    ? splitRawSkills(job.skills)
    : job.tailoredSkills
      ? parseTailoredSkills(job.tailoredSkills)
      : [];

  const seen = new Set<string>();
  const terms: string[] = [];

  for (const term of rawTerms) {
    const normalized = term.toLowerCase();
    if (normalized === employer || seen.has(normalized)) continue;
    seen.add(normalized);
    terms.push(term);
    if (terms.length === 2) break;
  }

  return terms;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const ENGINEERING_KEYWORDS = [
  "engineer",
  "developer",
  "sde",
  "mts",
  "programmer",
  "swe",
];

function normalizeSalaryTitle(title: string): string | null {
  const lower = title.toLowerCase();
  if (ENGINEERING_KEYWORDS.some((kw) => lower.includes(kw))) {
    return "Software Engineer";
  }
  return null;
}

function quoteTerms(terms: string[]): string {
  return terms.map((term) => `"${term}"`).join(" ");
}

function formatTermList(terms: string[]): string {
  if (terms.length === 0) return "";
  if (terms.length === 1) return terms[0];
  if (terms.length === 2) return `${terms[0]} and ${terms[1]}`;
  return `${terms.slice(0, -1).join(", ")}, and ${terms.at(-1)}`;
}

function buildDork(
  prefix: "LinkedIn profiles" | "GitHub pages" | "Web results",
  queryTerms: string[],
): ReadyPanelGoogleDorkLink | null {
  if (queryTerms.length === 0) return null;

  const query = quoteTerms(queryTerms);
  return {
    query,
    href: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    label: `${prefix} with ${formatTermList(queryTerms)} in them`,
  };
}

export function buildReadyPanelGoogleDorks(
  job: Job,
): ReadyPanelGoogleDorkLink[] {
  const employer = job.employer.trim();
  const title = job.title.trim();
  const keywords = getKeywordTerms(job);

  if (!employer && keywords.length === 0) {
    return [];
  }

  const linkedinTerms = [employer, ...keywords].filter(Boolean);
  const githubTerms = [employer, ...keywords].filter(Boolean);
  const webTerms = [employer, title, keywords[0]].filter(Boolean);

  const links: ReadyPanelGoogleDorkLink[] = [];

  // Direct LinkedIn people search — filtered to 1st/2nd degree connections
  // so you can find referrals at the company.
  if (employer) {
    const referralParams = new URLSearchParams({
      keywords: employer,
      network: '["F","S"]',
      origin: "FACETED_SEARCH",
    });
    links.push({
      query: employer,
      href: `https://www.linkedin.com/search/results/people/?${referralParams.toString()}`,
      label: `Your connections at ${employer}`,
    });
  }

  const linkedinQuery =
    linkedinTerms.length > 0
      ? `site:linkedin.com/in ${quoteTerms(linkedinTerms)}`
      : "";
  if (linkedinQuery) {
    links.push({
      query: linkedinQuery,
      href: `https://www.google.com/search?q=${encodeURIComponent(linkedinQuery)}`,
      label: `LinkedIn profiles with ${formatTermList(linkedinTerms)} in them`,
    });
  }

  const githubQuery =
    githubTerms.length > 0 ? `site:github.com ${quoteTerms(githubTerms)}` : "";
  if (githubQuery) {
    links.push({
      query: githubQuery,
      href: `https://www.google.com/search?q=${encodeURIComponent(githubQuery)}`,
      label: `GitHub pages with ${formatTermList(githubTerms)} in them`,
    });
  }

  const webLink = buildDork("Web results", webTerms);
  if (webLink) {
    links.push(webLink);
  }

  // --- Salary comparison links ---
  if (employer) {
    const companySlug = toSlug(employer);
    const salaryTitle = title ? normalizeSalaryTitle(title) : null;

    if (salaryTitle) {
      const salarySlug = toSlug(salaryTitle);

      links.push({
        query: `levels.fyi ${employer} ${salaryTitle}`,
        href: `https://www.levels.fyi/companies/${companySlug}/salaries/${salarySlug}`,
        label: `${salaryTitle} salary at ${employer} on Levels.fyi`,
      });

      links.push({
        query: `ambitionbox ${employer} ${salaryTitle}`,
        href: `https://www.ambitionbox.com/salaries/${companySlug}-salaries/${salarySlug}`,
        label: `${salaryTitle} salary at ${employer} on AmbitionBox`,
      });
    } else {
      links.push({
        query: `levels.fyi ${employer}`,
        href: `https://www.levels.fyi/companies/${companySlug}/salaries`,
        label: `Salaries at ${employer} on Levels.fyi`,
      });

      links.push({
        query: `ambitionbox ${employer}`,
        href: `https://www.ambitionbox.com/salaries/${companySlug}-salaries`,
        label: `Salaries at ${employer} on AmbitionBox`,
      });
    }

    const glassdoorLabel = title || "salaries";
    const glassdoorQuery = title
      ? `site:glassdoor.com/Salary "${employer}" "${title}" salary`
      : `site:glassdoor.com/Salary "${employer}" salaries`;
    links.push({
      query: glassdoorQuery,
      href: `https://www.google.com/search?q=${encodeURIComponent(glassdoorQuery)}`,
      label: `${glassdoorLabel} salary at ${employer} on Glassdoor`,
    });
  }

  return links;
}
