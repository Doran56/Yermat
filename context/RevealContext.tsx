import { createContext, useContext, useState, useCallback } from 'react';

export type RevealData = {
  rankGlobal: number | null;
  totalGlobal: number | null;
  rankBar: number | null;
  totalBar: number | null;
  timeMs: number;
  barName: string | null;
};

interface RevealContextValue {
  revealData: RevealData | null;
  showReveal: (data: RevealData) => void;
  clearReveal: () => void;
}

const RevealContext = createContext<RevealContextValue>({
  revealData: null,
  showReveal: () => {},
  clearReveal: () => {},
});

export function RevealProvider({ children }: { children: React.ReactNode }) {
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const showReveal = useCallback((data: RevealData) => setRevealData(data), []);
  const clearReveal = useCallback(() => setRevealData(null), []);
  return (
    <RevealContext.Provider value={{ revealData, showReveal, clearReveal }}>
      {children}
    </RevealContext.Provider>
  );
}

export const useReveal = () => useContext(RevealContext);
