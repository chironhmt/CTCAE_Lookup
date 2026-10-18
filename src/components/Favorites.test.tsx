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
  expect(cardCount()).toBe(11);
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
  expect(cardCount()).toBe(13);
  expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toContain("10001760");

  await user.click(within(card("Alopecia")).getByRole("button", { name: "Remove from favorites" }));
  expect(screen.queryByRole("article", { name: "Alopecia" })).not.toBeInTheDocument();
  expect(cardCount()).toBe(12);
});

test("Reset to defaults restores the 12 default terms", async () => {
  const user = userEvent.setup();
  render(<App />);
  for (const name of ["Anemia", "Nausea", "Fatigue"]) {
    await user.click(within(card(name)).getByRole("button", { name: "Remove from favorites" }));
  }
  expect(cardCount()).toBe(9);
  await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
  expect(cardCount()).toBe(12);
  expect(card("Anemia")).toBeInTheDocument();
});

test("removing every favorite shows the empty-state hint", async () => {
  localStorage.setItem(FAVORITES_KEY, "[]");
  render(<App />);
  expect(cardCount()).toBe(0);
  expect(screen.getByText(/No favorites yet/)).toBeInTheDocument();
});
