import clsx from "clsx";
import { X } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, type LinkProps } from "react-router-dom";

// ------------------------------------------------------------------ buttons

type Variant = "cta" | "primary" | "outline" | "ghost" | "danger" | "onDark";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  cta: "bg-cta text-cta-ink shadow-soft hover:brightness-95 active:brightness-90",
  primary: "bg-primary text-primary-ink hover:brightness-110",
  outline: "border border-line bg-surface text-ink shadow-sm hover:border-ink/30 hover:bg-tint/40",
  ghost: "text-ink hover:bg-tint/60",
  danger: "bg-status-overdue text-white hover:brightness-110",
  onDark: "bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg gap-1.5",
  md: "h-11 px-5 text-[15px] rounded-xl gap-2",
  lg: "h-14 px-7 text-base rounded-xl gap-2",
};

export function buttonClass(variant: Variant = "cta", size: Size = "md", extra?: string) {
  return clsx(
    "inline-flex select-none items-center justify-center font-semibold transition duration-150 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }>(
  function Button({ variant = "cta", size = "md", loading, className, children, disabled, type = "button", ...rest }, ref) {
    return (
      <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading} {...rest}>
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
        {children}
      </button>
    );
  },
);

export function ButtonLink({ variant = "cta", size = "md", className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

// ------------------------------------------------------------------ badges

type Tone = "ride" | "primary" | "tint" | "available" | "low" | "booked" | "overdue" | "outline";
const tones: Record<Tone, string> = {
  ride: "bg-ride text-ink",
  primary: "bg-primary text-primary-ink",
  tint: "bg-tint text-ink",
  available: "bg-status-available-bg text-status-available",
  low: "bg-status-low-bg text-status-low",
  booked: "bg-status-booked-bg text-status-booked",
  overdue: "bg-status-overdue-bg text-status-overdue",
  outline: "border border-line bg-surface text-ink-soft",
};

export function Badge({ tone = "tint", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

// ------------------------------------------------------------------ feedback

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} aria-hidden />;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-tint text-primary">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="mt-1.5 max-w-md text-ink-soft">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "overdue", children, className }: { tone?: "overdue" | "available" | "low"; children: ReactNode; className?: string }) {
  const map = {
    overdue: "border-status-overdue/30 bg-status-overdue-bg text-status-overdue",
    available: "border-status-available/30 bg-status-available-bg text-status-available",
    low: "border-status-low/30 bg-status-low-bg text-status-low",
  };
  return (
    <div role={tone === "overdue" ? "alert" : "status"} className={clsx("rounded-xl border px-4 py-3 text-sm font-medium", map[tone], className)}>
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ form field

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="field-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <label htmlFor={inputId} className="inline-flex cursor-pointer items-center gap-3">
      <span className="relative inline-flex">
        <input id={inputId} type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line transition peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

// ------------------------------------------------------------------ overlays

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

export function Dialog({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEscape(open, onClose);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="absolute inset-0 bg-island/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="card relative w-full max-w-md animate-fade-up p-6 outline-none">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-2 text-ink-soft">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel, loading }: {
  open: boolean; title: string; message: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}
      footer={<>
        <Button variant="outline" onClick={onCancel}>Go back</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}>
      {message}
    </Dialog>
  );
}

/** Side drawer on desktop, bottom sheet on mobile. */
export function Sheet({ open, onClose, title, children, side = "right" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; side?: "right" | "bottom" }) {
  useEscape(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-island/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={title}
        className={clsx("absolute flex flex-col bg-surface shadow-lift animate-fade-up",
          side === "right" ? "inset-y-0 right-0 w-full max-w-lg" : "inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl")}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-tint" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function PageHeading({ eyebrow, title, children, center }: { eyebrow?: string; title: string; children?: ReactNode; center?: boolean }) {
  return (
    <div className={clsx("mb-8", center && "text-center")}>
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="h-display text-5xl sm:text-6xl">{title}</h1>
      {children && <p className={clsx("mt-3 text-lg text-ink-soft", center && "mx-auto max-w-xl")}>{children}</p>}
    </div>
  );
}
