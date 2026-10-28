import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { strings } from "./strings";

beforeEach(() => localStorage.clear());

const cards = () => screen.queryAllByRole("article");

test("first load shows the 8 default terms in order with definition and grades 1-5", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "CTCAE Lookup for Hematologist", level: 1 })).toBeInTheDocument();
  expect(cards().map((c) => within(c).getByRole("heading").textContent)).toEqual([
    "Neutrophil count decreased",
    "Thrombocytopenia",
    "Anemia",
    "Nausea",
    "Vomiting",
    "Diarrhea",
    "Infusion related reaction",
    "Peripheral sensory neuropathy",
  ]);

  const anemia = screen.getByRole("article", { name: "Anemia" });
  expect(within(anemia).getByText(/reduction in the amount of hemoglobin/)).toBeInTheDocument();
  for (const level of [1, 2, 3, 4, 5]) expect(within(anemia).getByText(`Grade ${level}`)).toBeInTheDocument();
  expect(within(anemia).getByText("Hgb <8.0 g/dL; <4.9 mmol/L; <80 g/L; transfusion indicated")).toBeInTheDocument();
});

test("grades that do not apply show an em dash", async () => {
  render(<App />);
  await userEvent.setup().type(screen.getByRole("combobox", { name: "Search adverse events" }), "febrile neutropenia");
  // Febrile neutropenia has no Grade 1 or 2 in CTCAE v6.0.
  const fn = screen.getByRole("article", { name: "Febrile neutropenia" });
  // Grade 1 and 2 rows: a visible dash plus screen-reader text.
  expect(within(fn).getAllByText(strings.notApplicableLabel)).toHaveLength(2);
  expect(within(fn).getAllByText("—")).toHaveLength(2);
  for (const dash of within(fn).getAllByText("—")) expect(dash).toHaveAttribute("aria-hidden", "true");
});

test("footer credits CTCAE, MedDRA and NCI, with trademark and license notices", () => {
  render(<App />);
  expect(
    screen.getByText(
      "This tool is based on CTCAE v6.0 and MedDRA v28.0, courtesy of the National Cancer Institute (NCI). " +
        "MedDRA® is a registered trademark of the International Council for Harmonisation (ICH). " +
        "This tool is not affiliated with or endorsed by NCI or ICH. " +
        "© 2026 Myeloma Center, Eunpyeong St. Mary's Hospital. Released under the MIT License.",
    ),
  ).toBeInTheDocument();
});

test("rendered text contains no Hangul", () => {
  const { container } = render(<App />);
  expect(container.textContent).not.toMatch(/[ᄀ-ᇿ㄰-㆏가-힯]/);
});

test("first load does not write defaults to storage", () => {
  render(<App />);
  expect(localStorage.length).toBe(0);
});
