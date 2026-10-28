// Proofreader's marks, drawn as SVG in one stroke weight. They are the game's controls.
type MarkProps = { className?: string; title?: string };

const svg = (path: React.ReactNode, { className, title }: MarkProps, viewBox = "0 0 24 24") => (
  <svg className={className} viewBox={viewBox} width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
    {title ? <title>{title}</title> : null}
    {path}
  </svg>
);

/** Caret: "insert here", used for the City Editor's notes. */
export const Caret = (p: MarkProps) => svg(<path d="M5 17 12 6l7 11" />, p);
/** Check: the call was made. */
export const Check = (p: MarkProps) => svg(<path d="m5 12.5 4.5 4.5L19 7" />, p);
/** Strike: the call was missed. */
export const Strike = (p: MarkProps) => svg(<path d="M4 12h16M7 8l10 8" />, p);
/** Padlock-free "not yet": a closed bracket, the copy that hasn't come in. */
export const Pending = (p: MarkProps) => svg(<path data-pending d="M8 5H6v14h2M16 5h2v14h-2" />, p);
