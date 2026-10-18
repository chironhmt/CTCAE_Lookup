import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { RECENT_KEY } from "../lib/storage";

beforeEach(() => localStorage.clear());

const setup = () => {
  const user = userEvent.setup();
  render(<App />);
  return { user, input: screen.getByRole("combobox", { name: "Search adverse events" }) };
};
const cardNames = () => screen.queryAllByRole("article").map((a) => within(a).getByRole("heading").textContent);

test("typing shows matching cards and clearing returns to favorites", async () => {
  const { user, input } = setup();
  await user.type(input, "neutrophil");
  expect(cardNames()[0]).toBe("Neutrophil count decreased");
  expect(screen.queryByRole("heading", { name: "Frequent adverse events" })).not.toBeInTheDocument();

  await user.clear(input);
  expect(screen.getByRole("heading", { name: "Frequent adverse events" })).toBeInTheDocument();
  expect(cardNames()).toHaveLength(12);
});

test("a query without matches shows 'No results found'", async () => {
  const { user, input } = setup();
  await user.type(input, "zzzzqqq");
  expect(screen.getByText("No results found")).toBeInTheDocument();
  expect(cardNames()).toHaveLength(0);
});

test("Enter records the query; empty focused bar lists recent searches; clicking re-runs; Clear empties", async () => {
  const { user, input } = setup();
  await user.type(input, "nausea{Enter}");
  await user.clear(input);
  await user.type(input, "fatigue{Enter}");
  expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual(["fatigue", "nausea"]);

  await user.clear(input);
  await user.click(input);
  const list = screen.getByRole("listbox", { name: "Recent searches" });
  expect(within(list).getAllByRole("option").map((o) => o.textContent)).toEqual(["fatigue", "nausea"]);

  await user.click(within(list).getByRole("option", { name: "nausea" }));
  expect(input).toHaveValue("nausea");
  expect(cardNames()[0]).toBe("Nausea");
  expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual(["nausea", "fatigue"]);

  await user.clear(input);
  await user.click(screen.getByRole("button", { name: "Clear" }));
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual([]);
});

test("selecting a suggestion records it as a recent search", async () => {
  const { user, input } = setup();
  await user.type(input, "mucos");
  await user.click(screen.getByRole("option", { name: "Mucositis oral" }));
  expect(input).toHaveValue("Mucositis oral");
  expect(cardNames()[0]).toBe("Mucositis oral");
  expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual(["Mucositis oral"]);
});

test("keyboard: arrows move through suggestions, Enter selects, Escape closes", async () => {
  const { user, input } = setup();
  await user.type(input, "vomit");
  const options = within(screen.getByRole("listbox", { name: "Suggestions" })).getAllByRole("option");
  expect(options[0]).toHaveTextContent("Vomiting");

  await user.keyboard("{ArrowDown}");
  expect(input).toHaveAttribute("aria-activedescendant", options[0]!.id);
  expect(options[0]).toHaveAttribute("aria-selected", "true");
  await user.keyboard("{ArrowUp}");
  expect(input).not.toHaveAttribute("aria-activedescendant");

  await user.keyboard("{ArrowDown}{Enter}");
  expect(input).toHaveValue("Vomiting");
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

  await user.keyboard("{ArrowDown}");
  expect(screen.getByRole("listbox")).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(input).toHaveAttribute("aria-expanded", "false");
});

test("keyboard: Tab reaches the recent-searches Clear button and focus returns to the input", async () => {
  localStorage.setItem(RECENT_KEY, JSON.stringify(["nausea", "anemia"]));
  const { user, input } = setup();
  await user.click(input);
  await user.tab();
  const clear = screen.getByRole("button", { name: "Clear" });
  expect(clear).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual([]);
  expect(input).toHaveFocus();
});

test("focus leaving the search area closes the popup", async () => {
  localStorage.setItem(RECENT_KEY, JSON.stringify(["nausea"]));
  const { user, input } = setup();
  await user.click(input);
  expect(screen.getByRole("listbox")).toBeInTheDocument();
  await user.click(document.body);
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});
