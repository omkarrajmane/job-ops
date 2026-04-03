import { createJob } from "@shared/testing/factories.js";
import { describe, expect, it } from "vitest";
import { buildReadyPanelGoogleDorks } from "./ready-panel-google-dorks";

describe("buildReadyPanelGoogleDorks", () => {
  it("returns referral, dork, and salary links from employer, title, and skills", () => {
    const links = buildReadyPanelGoogleDorks(
      createJob({
        employer: "HP",
        title: "Frontend Engineer",
        skills: "Wolf Security, React, TypeScript",
      }),
    );

    expect(links).toHaveLength(7);

    expect(links[0]).toMatchObject({
      query: "HP",
      label: "Your connections at HP",
    });
    expect(links[0]?.href).toContain("linkedin.com/search/results/people");

    expect(links[1]).toMatchObject({
      query: 'site:linkedin.com/in "HP" "Wolf Security" "React"',
      label: "LinkedIn profiles with HP, Wolf Security, and React in them",
    });

    expect(links[2]).toMatchObject({
      query: 'site:github.com "HP" "Wolf Security" "React"',
      label: "GitHub pages with HP, Wolf Security, and React in them",
    });

    expect(links[3]).toMatchObject({
      query: '"HP" "Frontend Engineer" "Wolf Security"',
      label:
        "Web results with HP, Frontend Engineer, and Wolf Security in them",
    });

    expect(links[4]).toMatchObject({
      label: "Software Engineer salary at HP on Levels.fyi",
      href: "https://www.levels.fyi/companies/hp/salaries/software-engineer",
    });

    expect(links[5]).toMatchObject({
      label: "Software Engineer salary at HP on AmbitionBox",
      href: "https://www.ambitionbox.com/salaries/hp-salaries/software-engineer",
    });

    expect(links[6]).toMatchObject({
      label: "Frontend Engineer salary at HP on Glassdoor",
    });
    expect(links[6]?.href).toContain("site%3Aglassdoor.com%2FSalary");
    expect(links[6]?.href).toContain("Frontend%20Engineer");
  });

  it("falls back to tailored skills when raw skills are absent", () => {
    const links = buildReadyPanelGoogleDorks(
      createJob({
        employer: "Acme",
        title: "Backend Engineer",
        skills: null,
        tailoredSkills: JSON.stringify(["Node.js", "TypeScript"]),
      }),
    );

    expect(links[1]?.query).toBe(
      'site:linkedin.com/in "Acme" "Node.js" "TypeScript"',
    );
  });

  it("deduplicates repeated keywords and excludes employer matches", () => {
    const links = buildReadyPanelGoogleDorks(
      createJob({
        employer: "Acme",
        skills: "Acme, React, react, TypeScript, TypeScript",
      }),
    );

    expect(links[1]?.query).toBe(
      'site:linkedin.com/in "Acme" "React" "TypeScript"',
    );
    expect(links[2]?.query).toBe('site:github.com "Acme" "React" "TypeScript"');
  });

  it("returns no links when employer and usable keywords are missing", () => {
    const links = buildReadyPanelGoogleDorks(
      createJob({
        employer: "",
        skills: null,
        tailoredSkills: null,
      }),
    );

    expect(links).toEqual([]);
  });

  it("normalizes engineering titles to Software Engineer for salary links", () => {
    const links = buildReadyPanelGoogleDorks(
      createJob({
        employer: "Goldman Sachs",
        title: "Senior AI Backend Engineer",
        skills: "Java, Python",
      }),
    );

    const levelsFyi = links.find((l) => l.query.startsWith("levels.fyi"));
    expect(levelsFyi?.href).toBe(
      "https://www.levels.fyi/companies/goldman-sachs/salaries/software-engineer",
    );
    expect(levelsFyi?.label).toBe(
      "Software Engineer salary at Goldman Sachs on Levels.fyi",
    );

    const ambitionBox = links.find((l) => l.query.startsWith("ambitionbox"));
    expect(ambitionBox?.href).toBe(
      "https://www.ambitionbox.com/salaries/goldman-sachs-salaries/software-engineer",
    );

    const glassdoor = links.find((l) => l.query.includes("glassdoor"));
    expect(glassdoor?.href).toContain("Senior%20AI%20Backend%20Engineer");
  });

  it("falls back to company-only salary links for non-engineering titles", () => {
    const links = buildReadyPanelGoogleDorks(
      createJob({
        employer: "Google",
        title: "Product Manager",
        skills: "Strategy",
      }),
    );

    const levelsFyi = links.find((l) => l.query.startsWith("levels.fyi"));
    expect(levelsFyi?.href).toBe(
      "https://www.levels.fyi/companies/google/salaries",
    );
    expect(levelsFyi?.label).toBe("Salaries at Google on Levels.fyi");

    const glassdoor = links.find((l) => l.query.includes("glassdoor"));
    expect(glassdoor?.href).toContain("Product%20Manager");
  });

  it("produces company-only salary links when title is empty", () => {
    const links = buildReadyPanelGoogleDorks(
      createJob({
        employer: "Google",
        title: "",
        skills: "TypeScript",
      }),
    );

    const levelsFyi = links.find((l) => l.query.startsWith("levels.fyi"));
    expect(levelsFyi?.href).toBe(
      "https://www.levels.fyi/companies/google/salaries",
    );
    expect(levelsFyi?.label).toBe("Salaries at Google on Levels.fyi");

    const ambitionBox = links.find((l) => l.query.startsWith("ambitionbox"));
    expect(ambitionBox?.href).toBe(
      "https://www.ambitionbox.com/salaries/google-salaries",
    );

    const glassdoor = links.find((l) => l.query.includes("glassdoor"));
    expect(glassdoor?.label).toBe("salaries salary at Google on Glassdoor");
  });

  it("maps SDE and MTS titles to Software Engineer", () => {
    for (const title of ["SDE II", "MTS 2", "Senior SWE"]) {
      const links = buildReadyPanelGoogleDorks(
        createJob({ employer: "Meta", title, skills: "Python" }),
      );

      const levelsFyi = links.find((l) => l.query.startsWith("levels.fyi"));
      expect(levelsFyi?.label).toBe(
        "Software Engineer salary at Meta on Levels.fyi",
      );
    }
  });
});
