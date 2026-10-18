import { render, screen, within } from "@testing-library/react";
import App from "./App";
import { strings } from "./strings";

beforeEach(() => localStorage.clear());

const cards = () => screen.queryAllByRole("article");

test("first load shows the 12 default terms with definition and grades 1-5", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "CTCAE Lookup", level: 1 })).toBeInTheDocument();
  expect(cards()).toHaveLength(12);

  const anemia = screen.getByRole("article", { name: "Anemia" });
  expect(within(anemia).getByText(/reduction in the amount of hemoglobin/)).toBeInTheDocument();
  for (const level of [1, 2, 3, 4, 5]) expect(within(anemia).getByText(`Grade ${level}`)).toBeInTheDocument();
  expect(within(anemia).getByText("Hgb <8.0 g/dL; <4.9 mmol/L; <80 g/L; transfusion indicated")).toBeInTheDocument();
});

test("grades that do not apply show an em dash", () => {
  render(<App />);
  // Febrile neutropenia has no Grade 1 or 2 in CTCAE v6.0.
  const fn = screen.getByRole("article", { name: "Febrile neutropenia" });
  // Grade 1 and 2 rows: a visible dash plus screen-reader text.
  expect(within(fn).getAllByText(strings.notApplicableLabel)).toHaveLength(2);
  expect(within(fn).getAllByText("—")).toHaveLength(2);
  for (const dash of within(fn).getAllByText("—")) expect(dash).toHaveAttribute("aria-hidden", "true");
});

test("footer credits NCI, links to the original files, and shows the disclaimer", () => {
  render(<App />);
  expect(screen.getByText(/Content courtesy of the National Cancer Institute \(NCI\)\./)).toBeInTheDocument();
  const link = screen.getByRole("link", { name: "Original CTCAE files at NCI" });
  expect(link).toHaveAttribute("href", "https://dctd.cancer.gov/research/ctep-trials/for-sites/adverse-events");
  expect(screen.getByText("For reference only. Refer to the official CTCAE document.")).toBeInTheDocument();
});

test("rendered text contains no Hangul", () => {
  const { container } = render(<App />);
  expect(container.textContent).not.toMatch(/[ᄀ-ᇿ㄰-㆏가-힯]/);
});

test("first load does not write defaults to storage", () => {
  render(<App />);
  expect(localStorage.length).toBe(0);
});
