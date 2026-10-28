# CTCAE Lookup

A web app for looking up adverse event definitions and grades from **CTCAE v6.0** and **CTCAE v5.0**. It is built for hematology/oncology physicians and nurses.

- A menu in the header switches between CTCAE v6.0 (default) and v5.0. The choice is remembered in the browser.
- The home screen shows 8 frequently used adverse events with their definitions and Grades 1–5.
- Search covers all terms of the selected version (850 in v6.0, 837 in v5.0). It accepts English names, common abbreviations (ANC, PLT, CRS, …), the other version's name for a renamed term (e.g. "platelet count decreased" ↔ "thrombocytopenia"), and minor typos.
- You can star terms to add them to or remove them from the home screen. Favorites are shared across versions; a favorite that does not exist in the selected version is hidden (and counted) rather than deleted. Your favorites and recent searches are saved only in your browser (`localStorage`). There is no login, no server, and no patient data.

> For reference only. Refer to the official CTCAE document.

## Setup

Requires Node.js 22 or later.

```sh
npm install
npx playwright install chromium   # only needed for end-to-end tests
npm run dev                       # http://localhost:5173
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts the dev server |
| `npm run data` | Regenerates `src/data/ctcae-v6.json` and `src/data/ctcae-v5.json` from the NCI spreadsheets |
| `npm run build` | Type-checks and builds the static site into `dist/` |
| `npm run preview` | Serves the `dist/` build locally |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs unit and component tests (Vitest) |
| `npm run test:e2e` | Runs end-to-end tests (Playwright) |

## Data

The source files are the NCI CTCAE spreadsheets in NCIt format, available from the [NCI CTCAE page](https://dctd.cancer.gov/research/ctep-trials/for-sites/adverse-events):

| Version | Source | Generated |
|---|---|---|
| v6.0 | `data/raw/NCIt_CTCAE 6.0.xlsx` | `src/data/ctcae-v6.json` |
| v5.0 | `data/raw/NCIt_CTCAE_5.0.xls` (legacy Excel format) | `src/data/ctcae-v5.json` |

`scripts/parse-ctcae.ts` reads the first sheet with [SheetJS](https://sheetjs.com) (which handles both `.xlsx` and `.xls`), using its column headers. Column names differ between releases (`CTCAE Preferred Term` vs `CTCAE PT`), and the CTCAE version is taken from the `CTCAE <version> Definition` header.
- Rows without a MedDRA code are System Organ Class headings. v5.0 leaves the CTCAE term blank on these rows, so the SOC name comes from the NCIt term ("Cardiac Disorders, CTCAE" → "Cardiac disorders").
- Each term has `Grade N <term>` rows that share its MedDRA code. Grade rows usually follow their term, but the v5.0 sheet lists one term after its grades, so grades are attached once all terms are read.

The build fails if a required column is missing, if a grade row has no parent term, if a term has no grades, or if a MedDRA code appears twice.

Terms are keyed by MedDRA code, so saved favorites still work across CTCAE versions as long as the code is unchanged. Terms renamed under a new code (v5.0 "Platelet count decreased" → v6.0 "Thrombocytopenia") are listed in `RENAMED` in `src/data/dataset.ts`, so a favorite follows the term in both versions.

### Updating a CTCAE file or adding a version

1. Put the new spreadsheet in `data/raw/` and add or update its entry in `SOURCES` in `scripts/build-data.ts`.
2. Run `npm run data` (or `npm run data -- "data/raw/<file>" src/data/<output>.json` for a single file).
3. For a new version, add the JSON to `CTCAE_VERSIONS`, `datasets` and `termsById` in `src/data/dataset.ts`, and add its aliases in `src/data/aliases.ts`.
4. Run `npm test`. The "is up to date with the source workbook" tests read the files listed in `scripts/parse-ctcae.test.ts`; update the paths, expected term counts and spot checks there if they changed.
5. Check the default favorites in `src/data/defaults.ts`, the aliases in `src/data/aliases.ts`, and `RENAMED`. The tests fail if any of them points to a term that no longer exists.

## Project layout

```
scripts/        Spreadsheet → JSON conversion and data/English-only tests
src/data/       Generated datasets per CTCAE version, types, default favorites, search aliases
src/lib/        Search ranking and localStorage helpers
src/components/ TermCard, SearchBar
src/strings.ts  All UI text (English only)
tests/e2e/      Playwright tests
```

## Deploying

This is a static Vite site. `vercel.json` sets the build command to `npm run build` and the output directory to `dist/`.

```sh
npx vercel          # preview deployment
npx vercel --prod   # production deployment
```

NCI allows text from its documents to be reused without permission unless marked otherwise. For digital reuse, NCI asks that it be credited as the source and that a link to the original material be provided. The footer does both: it credits the National Cancer Institute and links to the NCI CTCAE page. Keep the attribution, the link, and the disclaimer when changing the footer.
