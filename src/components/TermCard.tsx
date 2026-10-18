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
}

export function TermCard({ term, isFavorite, onToggleFavorite }: TermCardProps) {
  const headingId = `term-${term.id}`;
  return (
    <article aria-labelledby={headingId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="text-lg font-semibold text-slate-900">
            {term.term}
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

      <p className="mt-2 text-sm text-slate-700">
        <span className="sr-only">{strings.definition}: </span>
        {term.definition || strings.noDefinition}
      </p>

      <dl className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
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
