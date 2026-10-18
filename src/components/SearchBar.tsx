import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { strings } from "../strings";

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Term names matching the current query. */
  suggestions: readonly string[];
  recent: readonly string[];
  /** Called when the user confirms a search (Enter or picking an option). */
  onCommit: (query: string) => void;
  onClearRecent: () => void;
}

export function SearchBar({ query, onQueryChange, suggestions, recent, onCommit, onClearRecent }: SearchBarProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const showingRecent = query.trim() === "";
  const options = showingRecent ? recent : suggestions;
  const expanded = open && options.length > 0;

  function choose(value: string) {
    onQueryChange(value);
    onCommit(value);
    close();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!open) setOpen(true);
        if (options.length === 0) return;
        // -1 means focus stays on the text itself.
        const down = e.key === "ArrowDown";
        setActive((i) => (down ? Math.min(i + 1, options.length - 1) : Math.max(i - 1, -1)));
        break;
      }
      case "Enter": {
        e.preventDefault();
        const picked = expanded && active >= 0 ? options[active] : undefined;
        if (picked !== undefined) choose(picked);
        else if (query.trim()) {
          onCommit(query);
          setOpen(false);
        }
        break;
      }
      case "Escape":
        if (expanded) {
          e.preventDefault();
          close();
        } else if (query) {
          onQueryChange("");
        }
        break;
    }
  }

  function close() {
    setOpen(false);
    setActive(-1);
  }

  // Keep the popup open while focus moves into it (e.g. Tab to "Clear").
  function onBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) close();
  }

  return (
    <div className="relative" onBlur={onBlur}>
      <label htmlFor={id} className="sr-only">
        {strings.searchLabel}
      </label>
      <input
        id={id}
        type="search"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        placeholder={strings.searchPlaceholder}
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        ref={inputRef}
        onKeyDown={onKeyDown}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-blue-600 focus:outline-2 focus:outline-blue-600"
      />
      {expanded && (
        <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {showingRecent && (
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs font-medium text-slate-600">
              <span>{strings.recentSearches}</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onClearRecent();
                  setActive(-1);
                  // The popup unmounts once the list is empty; keep keyboard focus on the input.
                  inputRef.current?.focus();
                }}
                className="rounded px-2 py-1 text-blue-700 hover:bg-blue-50"
              >
                {strings.clearRecent}
              </button>
            </div>
          )}
          <ul
            id={listId}
            role="listbox"
            aria-label={showingRecent ? strings.recentSearches : strings.suggestions}
            className="max-h-80 overflow-y-auto py-1"
          >
            {options.map((option, i) => (
              <li
                key={option}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
                className={`cursor-pointer px-4 py-2 text-sm text-slate-900 ${i === active ? "bg-blue-100" : "hover:bg-slate-50"}`}
              >
                {option}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
