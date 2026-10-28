import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { FAVORITES_KEY, VERSION_KEY } from "../lib/storage";

beforeEach(() => localStorage.clear());

const versionSelect = () => screen.getByRole("combobox", { name: "CTCAE version" });
const cardNames = () => screen.queryAllByRole("article").map((a) => within(a).getByRole("heading").textContent);
const footer = () => screen.getByRole("contentinfo");

test("the subtitle offers CTCAE v6.0 (default) and v5.0", () => {
  render(<App />);
  expect(versionSelect()).toHaveValue("6.0");
  expect(within(versionSelect()).getAllByRole("option").map((o) => o.textContent)).toEqual(["CTCAE v6.0", "CTCAE v5.0"]);
  expect(footer()).toHaveTextContent("based on CTCAE v6.0 and MedDRA v28.0");
});

test("switching to v5.0 shows v5.0 grades, names and footer, and the choice persists", async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);
  await user.selectOptions(versionSelect(), "5.0");

  // Thrombocytopenia (v6.0) was "Platelet count decreased" in v5.0.
  expect(cardNames()).toEqual([
    "Neutrophil count decreased",
    "Platelet count decreased",
    "Anemia",
    "Nausea",
    "Vomiting",
    "Diarrhea",
    "Infusion related reaction",
    "Peripheral sensory neuropathy",
  ]);
  // v5.0 writes "<LLN-10.0", v6.0 "<LLN - 10.0".
  expect(within(screen.getByRole("article", { name: "Anemia" })).getByText(/^Hemoglobin \(Hgb\) <LLN-10\.0 g\/dL/)).toBeInTheDocument();
  expect(footer()).toHaveTextContent("based on CTCAE v5.0 and MedDRA v20.1");
  expect(JSON.parse(localStorage.getItem(VERSION_KEY)!)).toBe("5.0");

  unmount();
  render(<App />);
  expect(versionSelect()).toHaveValue("5.0");
});

test("search uses the selected version", async () => {
  const user = userEvent.setup();
  render(<App />);
  const search = screen.getByRole("combobox", { name: "Search adverse events" });
  await user.type(search, "icans");
  expect(cardNames()[0]).toBe("Immune effector cell-associated neurotoxicity syndrome");

  await user.selectOptions(versionSelect(), "5.0");
  expect(cardNames()).not.toContain("Immune effector cell-associated neurotoxicity syndrome");
  await user.clear(search);
  await user.type(search, "thrombocytopenia");
  expect(cardNames()[0]).toBe("Platelet count decreased");
});

test("favorites are shared across versions and follow renamed terms", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.selectOptions(versionSelect(), "5.0");

  // Unstarring the renamed term in v5.0 removes the v6.0 favorite too.
  await user.click(
    within(screen.getByRole("article", { name: "Platelet count decreased" })).getByRole("button", { name: "Remove from favorites" }),
  );
  expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).not.toContain("10043554");
  await user.selectOptions(versionSelect(), "6.0");
  expect(cardNames()).not.toContain("Thrombocytopenia");
});

test("favorites missing from the selected version are kept and counted", async () => {
  // Graft versus host disease is new in v6.0; Thrombocytopenia saved under both codes shows once.
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(["10018651", "10043554", "10035528", "10002272"]));
  const user = userEvent.setup();
  render(<App />);
  expect(cardNames()).toEqual(["Graft versus host disease", "Thrombocytopenia", "Anemia"]);

  await user.selectOptions(versionSelect(), "5.0");
  expect(cardNames()).toEqual(["Platelet count decreased", "Anemia"]);
  expect(screen.getByText("1 favorite is not in CTCAE v5.0 and is hidden.")).toBeInTheDocument();

  // Editing favorites in v5.0 keeps the v6.0-only one.
  await user.click(within(screen.getByRole("article", { name: "Anemia" })).getByRole("button", { name: "Remove from favorites" }));
  await user.selectOptions(versionSelect(), "6.0");
  expect(cardNames()).toEqual(["Graft versus host disease", "Thrombocytopenia"]);
  expect(screen.queryByText(/not in CTCAE/)).not.toBeInTheDocument();
});
