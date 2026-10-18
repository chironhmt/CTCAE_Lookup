# CTCAE Lookup

A web app for looking up adverse event definitions and grades from **CTCAE v6.0**. It is built for hematology/oncology physicians and nurses.

- The home screen shows 12 frequently used adverse events with their definitions and Grades 1–5.
- Search covers all 850 CTCAE v6.0 terms. It accepts English names, common abbreviations (ANC, PLT, CRS, …), v5.0 names that were renamed in v6.0, and minor typos.
- You can star terms to add them to or remove them from the home screen. Your favorites and recent searches are saved only in your browser (`localStorage`). There is no login, no server, and no patient data.

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
| `npm run data` | Regenerates `src/data/ctcae-v6.json` from the XLSX |
| `npm run build` | Type-checks and builds the static site into `dist/` |
| `npm run preview` | Serves the `dist/` build locally |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs unit and component tests (Vitest) |
| `npm run test:e2e` | Runs end-to-end tests (Playwright) |

## Data

The source file is the NCI CTCAE v6.0 spreadsheet in NCIt format, `data/raw/NCIt_CTCAE 6.0.xlsx`, available from the [NCI CTCAE page](https://dctd.cancer.gov/research/ctep-trials/for-sites/adverse-events).

`scripts/parse-ctcae.ts` reads the sheet using its column headers:
- Rows without a MedDRA code are System Organ Class headings.
- Each term row is followed by `Grade N <term>` rows that share its MedDRA code.

The build fails if a required column is missing, if a grade row has no parent term, if a term has no grades, or if a MedDRA code appears twice.

Terms are keyed by MedDRA code, so saved favorites still work after a CTCAE update as long as the code is unchanged.

### Updating to a new CTCAE file

1. Put the new XLSX in `data/raw/`.
2. Run `npm run data -- "data/raw/<file>.xlsx"`.
3. Run `npm test`. The test "is up to date with the XLSX" reads `data/raw/NCIt_CTCAE 6.0.xlsx`. If the file name changed, update the path in `scripts/parse-ctcae.test.ts`, and update the expected term count and the spot checks if the content changed.
4. Check the default favorites in `src/data/defaults.ts` and the aliases in `src/data/aliases.ts`. The tests fail if any of them points to a term that no longer exists.

## Project layout

```
scripts/        XLSX → JSON conversion and data/English-only tests
src/data/       Generated dataset, types, default favorites, search aliases
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
