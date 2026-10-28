export type Question =
  | { kind: "choice"; prompt: string; options: string[]; answerIndex: number }
  | { kind: "days"; prompt: string; answerDays: number; tolerance: number };

export type DayResult = { correct: boolean; hintsUsed: number; answeredOn: string /* YYYY-MM-DD */ };

export type Progress = { days: Record<number, DayResult>; finale?: { guessSeconds: number; answeredOn: string } };
