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

/** Tab-bar icons, same stroke: today's paper, the detective's lens, a quest's route, your agent. */
export const PaperIcon = (p: MarkProps) => svg(<><rect x="4" y="4" width="16" height="16" /><path d="M8 9h8M8 13h8M8 17h5" /></>, p);
export const LensIcon = (p: MarkProps) => svg(<><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></>, p);
export const RouteIcon = (p: MarkProps) => svg(<><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" /></>, p);
export const PersonIcon = (p: MarkProps) => svg(<><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></>, p);
/** Cross: take it off the list. */
export const Cross = (p: MarkProps) => svg(<path d="M7 7l10 10M17 7 7 17" />, p);
