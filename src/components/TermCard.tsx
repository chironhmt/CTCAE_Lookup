import { useState, type MouseEvent } from "react";
import { GRADE_LEVELS, type CtcaeTerm, type GradeLevel } from "../data/types";
import { strings } from "../strings";

const GRADE_STYLES: Record<GradeLevel, string> = {
  1: "bg-emerald-100 text-emerald-900",
  2: "bg-amber-100 text-amber-900",
  3: "bg-orange-200 text-orange-950",
  4: "bg-red-200 text-red-950",
  5: "bg-slate-800 text-white",
};

interface TermCardProps {
  term: CtcaeTerm;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  /** Start with the grade table hidden; clicking the card toggles it. */
  collapsible?: boolean;
}

export function TermCard({ term, isFavorite, onToggleFavorite, collapsible = false }: TermCardProps) {
  const headingId = `term-${term.id}`;
  const gradesId = `grades-${term.id}`;
  const [expanded, setExpanded] = useState(!collapsible);
  const showGrades = !collapsible || expanded;

  // Whole-card click target for mouse users; the title button covers keyboard users.
  // Ignore clicks on buttons (they act on their own) and drags that select text.
  function onCardClick(e: MouseEvent) {
    if (!collapsible || (e.target as Element).closest("button")) return;
    if (window.getSelection()?.toString()) return;
    setExpanded(!expanded);
  }

  return (
    <article
      aria-labelledby={headingId}
      onClick={onCardClick}
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${collapsible ? "cursor-pointer hover:border-slate-300" : ""}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="text-lg font-semibold text-slate-900">
            {collapsible ? (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                aria-controls={gradesId}
                className="flex items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                {term.term}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-90" : ""}`}
                >
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </button>
            ) : (
              term.term
            )}
          </h3>
          <p className="text-xs text-slate-600">{term.soc}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(term.id)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? strings.removeFavorite : strings.addFavorite}
          title={isFavorite ? strings.removeFavorite : strings.addFavorite}
          className="shrink-0 rounded-full p-2 text-2xl leading-none text-amber-500 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
        </button>
      </header>

      <p className={`mt-2 text-sm text-slate-700 ${showGrades ? "" : "line-clamp-1"}`}>
        <span className="sr-only">{strings.definition}: </span>
        {term.definition || strings.noDefinition}
      </p>

      <dl id={gradesId} hidden={!showGrades} className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
        {GRADE_LEVELS.map((level) => {
          const text = term.grades[level];
          return (
            <div key={level} className="grid grid-cols-[5.5rem_1fr] items-start gap-3 px-3 py-2 text-sm">
              <dt>
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${GRADE_STYLES[level]}`}>
                  {strings.grade(level)}
                </span>
              </dt>
              <dd className={text ? "text-slate-900" : "text-slate-500"}>
                {text ?? (
                  <>
                    <span aria-hidden="true">{strings.notApplicable}</span>
                    <span className="sr-only">{strings.notApplicableLabel}</span>
                  </>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}
