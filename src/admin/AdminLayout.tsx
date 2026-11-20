import clsx from "clsx";
import { Bike, BookOpen, CalendarDays, ClipboardList, ExternalLink, FolderTree, LayoutDashboard, LogOut, Menu, Settings, Tag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { PaletteSwitcher } from "@/theme/PaletteSwitcher";
import { currentUserEmail, isAdmin, signOut } from "@/lib/api";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { to: "/admin/calendar", label: "Availability", icon: CalendarDays },
  { to: "/admin/bikes", label: "Bikes", icon: Bike },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/promotions", label: "Promotions", icon: Tag },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/demo-guide", label: "Demo guide", icon: BookOpen },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col">
      <Link to="/admin" className="flex items-center gap-2.5 px-5 py-6" onClick={onNavigate}>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-on-dark-accent"><Bike size={22} aria-hidden /></span>
        <span className="leading-none">
          <span className="block font-display text-2xl tracking-wide text-white">Ride Easy</span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/75">Hotel admin</span>
        </span>
      </Link>
      <nav aria-label="Admin" className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => clsx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
              isActive ? "bg-white text-ink" : "text-white/85 hover:bg-white/10 hover:text-white")}>
            <Icon size={18} aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/15 p-3">
        <Link to="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10">
          <ExternalLink size={17} aria-hidden /> View public site
        </Link>
        <button onClick={() => { signOut(); navigate("/admin/login"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10">
          <LogOut size={17} aria-hidden /> Sign out
        </button>
        <p className="truncate px-3 pt-1 text-xs text-white/60">{currentUserEmail()}</p>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (!isAdmin()) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname)}`} replace />;

  return (
    <div className="min-h-screen bg-bg lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-island lg:block"><SidebarContent /></aside>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-island px-4 text-white lg:hidden">
        <Link to="/admin" className="font-display text-2xl tracking-wide">Ride Easy <span className="text-sm text-white/75">admin</span></Link>
        <button onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/10" aria-label="Open admin menu"><Menu /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-72 animate-fade-up bg-island">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/10" aria-label="Close admin menu"><X size={18} /></button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main key={location.pathname} className="min-w-0 flex-1 animate-fade-in px-4 py-8 sm:px-8">
        <Outlet />
      </main>
      <PaletteSwitcher position="right" />
    </div>
  );
}

export function AdminTitle({ title, children, actions }: { title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h-display text-4xl sm:text-5xl">{title}</h1>
        {children && <p className="mt-1 text-ink-soft">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
