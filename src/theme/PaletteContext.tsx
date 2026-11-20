import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { applyPalette, getPalette, initialPaletteId, savePaletteId, type Palette, type PaletteId } from "./palettes";

interface PaletteState {
  palette: Palette;
  setPalette: (id: PaletteId) => void;
}

const Ctx = createContext<PaletteState | null>(null);

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<PaletteId>(() => {
    const initial = initialPaletteId();
    applyPalette(initial);
    savePaletteId(initial); // a shared ?palette= link stays in effect while browsing
    return initial;
  });

  const setPalette = useCallback((next: PaletteId) => {
    applyPalette(next);
    savePaletteId(next);
    setId(next);
  }, []);

  return <Ctx.Provider value={{ palette: getPalette(id), setPalette }}>{children}</Ctx.Provider>;
}

export function usePalette() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePalette must be used inside PaletteProvider");
  return ctx;
}
