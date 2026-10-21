import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { FAVORITES_KEY } from "../lib/storage";

beforeEach(() => localStorage.clear());

const card = (name: string) => screen.getByRole("article", { name });
const cardCount = () => screen.queryAllByRole("article").length;

test("star toggle has accessible add/remove labels", async () => {
  const user = userEvent.setup();
  render(<App />);
  const star = within(card("Nausea")).getByRole("button", { name: "Remove from favorites" });
  expect(star).toHaveAttribute("aria-pressed", "true");
  await user.click(star);
  expect(screen.queryByRole("article", { name: "Nausea" })).not.toBeInTheDocument();
  expect(cardCount()).toBe(7);
});

test("adding from search results shows the term on the home view; removing hides it", async () => {
  const user = userEvent.setup();
  render(<App />);
  const input = screen.getByRole("combobox");

  await user.type(input, "alopecia");
  await user.click(within(card("Alopecia")).getByRole("button", { name: "Add to favorites" }));
  expect(within(card("Alopecia")).getByRole("button", { name: "Remove from favorites" })).toBeInTheDocument();

  await user.clear(input);
  expect(card("Alopecia")).toBeInTheDocument();
  expect(cardCount()).toBe(9);
  expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toContain("10001760");

  await user.click(within(card("Alopecia")).getByRole("button", { name: "Remove from favorites" }));
  expect(screen.queryByRole("article", { name: "Alopecia" })).not.toBeInTheDocument();
  expect(cardCount()).toBe(8);
});

test("Reset to defaults restores the 8 default terms", async () => {
  const user = userEvent.setup();
  render(<App />);
  for (const name of ["Anemia", "Nausea", "Diarrhea"]) {
    await user.click(within(card(name)).getByRole("button", { name: "Remove from favorites" }));
  }
  expect(cardCount()).toBe(5);
  await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
  expect(cardCount()).toBe(8);
  expect(card("Anemia")).toBeInTheDocument();
});

test("removing every favorite shows the empty-state hint", async () => {
  localStorage.setItem(FAVORITES_KEY, "[]");
  render(<App />);
  expect(cardCount()).toBe(0);
  expect(screen.getByText(/No favorites yet/)).toBeInTheDocument();
});

test("Hide collapses the favorites section and the choice persists", async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);
  await user.click(screen.getByRole("button", { name: "Hide" }));
  expect(cardCount()).toBe(0);
  expect(screen.queryByRole("button", { name: "Reset to defaults" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show" })).toHaveAttribute("aria-expanded", "false");

  unmount();
  render(<App />);
  expect(cardCount()).toBe(0);
  await user.click(screen.getByRole("button", { name: "Show" }));
  expect(cardCount()).toBe(8);
});

test("favorite cards start with grades hidden and clicking the card shows them", async () => {
  const user = userEvent.setup();
  render(<App />);
  const anemia = card("Anemia");
  expect(within(anemia).queryByText("Grade 1")).not.toBeVisible();

  const toggle = within(anemia).getByRole("button", { name: "Anemia" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  await user.click(within(anemia).getByText(/reduction in the amount of hemoglobin/));
  expect(within(anemia).getByText("Grade 1")).toBeVisible();
  expect(toggle).toHaveAttribute("aria-expanded", "true");

  await user.click(toggle);
  expect(within(anemia).queryByText("Grade 1")).not.toBeVisible();
});

test("search result cards still show grades immediately", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByRole("combobox"), "alopecia");
  expect(within(card("Alopecia")).getByText("Grade 1")).toBeVisible();
});
