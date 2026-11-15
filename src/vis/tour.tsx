import { createContext, useContext, type ReactNode } from 'react';

/** Chrome for one stop of the guided tour. The player reads this; it does not own a second timer. */
export interface TourStop {
  index: number;
  total: number;
  title: string;
  instruction: string;
  takeaway: string;
  /** A qualification that stays visible with the takeaway. */
  aside?: string;
  /** When set, the PSI page shows these sets instead of the shared playground. */
  sets?: { a: string; b: string };
}

const TourCtx = createContext<TourStop | null>(null);

export function TourProvider({ stop, children }: { stop: TourStop; children: ReactNode }) {
  return <TourCtx.Provider value={stop}>{children}</TourCtx.Provider>;
}

export function useTour(): TourStop | null {
  return useContext(TourCtx);
}
