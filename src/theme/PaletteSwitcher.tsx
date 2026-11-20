import clsx from "clsx";
import { Check, Link2, Palette as PaletteIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePalette } from "./PaletteContext";
import { PALETTES } from "./palettes";

/**
 * Floating prototype tool: lets the client preview the site in each colour palette
 * that pairs with their hotel website. Not part of the final product.
 */
export function PaletteSwitcher({ position = "left", raised = false }: { position?: "left" | "right"; raised?: boolean }) {
  const { palette, setPalette } = usePalette();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  async function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("palette", palette.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this link:", url.toString());
    }
  }

  return (
    <div ref={panelRef} className={clsx("no-print fixed z-[55] flex flex-col",
      position === "left" ? "left-4 items-start" : "right-4 items-end", raised ? "bottom-24 lg:bottom-4" : "bottom-4")}>
      {open && (
        <div role="dialog" aria-label="Choose a colour palette"
          className="mb-3 w-[min(92vw,380px)] animate-fade-up overflow-hidden rounded-2xl border border-black/10 bg-white text-[#1F2A26] shadow-[0_24px_60px_-20px_rgba(0,0,0,.45)]">
          <div className="flex items-start justify-between gap-3 border-b border-black/5 px-4 pb-3 pt-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B7570]">Prototype tool</p>
              <h2 className="text-base font-bold">Try your hotel's colours</h2>
              <p className="mt-0.5 text-[13px] leading-snug text-[#4A5651]">Each palette pairs with one of the hotel website palettes. Pick one to see the whole site in it.</p>
            </div>
            <button onClick={() => setOpen(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/5" aria-label="Close palette picker">
              <X size={16} />
            </button>
          </div>

          <div role="radiogroup" aria-label="Colour palettes" className="max-h-[60vh] space-y-2 overflow-y-auto p-3">
            {PALETTES.map((p) => {
              const selected = p.id === palette.id;
              return (
                <button key={p.id} role="radio" aria-checked={selected} onClick={() => setPalette(p.id)}
                  className={clsx("w-full rounded-xl border-2 p-3 text-left transition",
                    selected ? "border-[#1F2A26] bg-[#FAF7F1]" : "border-transparent bg-[#FAF7F1]/60 hover:border-black/15")}>
                  <div className="flex h-7 overflow-hidden rounded-md">
                    {p.swatches.map((s) => <span key={s.hex} className="flex-1" style={{ background: s.hex }} title={`${s.name} ${s.hex}`} />)}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-bold">{p.name}</span>
                    {selected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#1F2A26] px-2 py-0.5 text-[11px] font-bold text-white"><Check size={12} /> In use</span>
                    ) : (
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-bold text-[#4A5651]">{p.tag}</span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-[#4A5651]">Pairs with hotel palette <b>{p.pairsWith}</b> · {p.feel}</p>
                  {selected && <p className="mt-1.5 text-[12.5px] leading-snug text-[#4A5651]">{p.story}</p>}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-black/5 px-4 py-3">
            <span className="text-[12px] text-[#6B7570]">Your choice is remembered on this device.</span>
            <button onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold hover:bg-black/5">
              <Link2 size={14} /> {copied ? "Link copied" : "Share link"}
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-black/10 bg-white py-1.5 pl-1.5 pr-4 text-sm font-semibold text-[#1F2A26] shadow-[0_10px_30px_-10px_rgba(0,0,0,.45)] transition hover:-translate-y-0.5">
        <span className="flex h-8 w-8 overflow-hidden rounded-full ring-1 ring-black/10">
          {[palette.tokens.primary, palette.tokens.cta, palette.tokens.ride].map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
        </span>
        <PaletteIcon size={15} aria-hidden />
        <span><span className="hidden sm:inline">Palette: </span>{palette.name}</span>
      </button>
    </div>
  );
}
