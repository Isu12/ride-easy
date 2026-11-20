import { Copy, Pencil, Plus, Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, ButtonLink, EmptyState, Skeleton, Toggle } from "@/components/ui";
import { useData } from "@/hooks/useData";
import { duplicateBike, listBikeImages, listBikes, listCategories, primaryImageFor, updateBikeFlags } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { AdminTitle } from "./AdminLayout";

export default function BikesAdmin() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading } = useData(async () => {
    const [bikes, categories, images] = await Promise.all([listBikes({ includeInactive: true }), listCategories(), listBikeImages()]);
    return { bikes, categories, images };
  });

  const rows = useMemo(() => (data?.bikes ?? []).filter((b) =>
    (!category || b.category_id === category) && b.name.toLowerCase().includes(query.trim().toLowerCase())), [data, query, category]);

  async function duplicate(id: string) {
    setBusy(id);
    const copy = await duplicateBike(id);
    setBusy(null);
    navigate(`/admin/bikes/${copy.id}`);
  }

  return (
    <>
      <AdminTitle title="Bikes" actions={<ButtonLink to="/admin/bikes/new"><Plus size={18} /> Add bike</ButtonLink>}>
        Changes appear on the public site straight away.
      </AdminTitle>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" size={18} aria-hidden />
          <input className="field pl-11" placeholder="Search bikes" aria-label="Search bikes" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="field sm:w-60" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading || !data ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<SearchX />} title="No bikes found" action={<Button variant="outline" onClick={() => { setQuery(""); setCategory(""); }}>Clear search</Button>}>
          Try another name or category.
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line bg-tint/40 text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-semibold">Bike</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 text-right font-semibold">Qty</th>
                <th className="px-4 py-3 text-right font-semibold">Hour / Day / Week</th>
                <th className="px-4 py-3 font-semibold">Active</th>
                <th className="px-4 py-3 font-semibold">Featured</th>
                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((b) => {
                const img = primaryImageFor(b.id, data.images);
                return (
                  <tr key={b.id} className="hover:bg-tint/20">
                    <td className="px-4 py-3">
                      <Link to={`/admin/bikes/${b.id}`} className="flex items-center gap-3 font-semibold hover:text-primary">
                        <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-tint">{img && <img src={img} alt="" className="h-full w-full object-cover mix-blend-multiply" />}</span>
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{data.categories.find((c) => c.id === b.category_id)?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{b.quantity_owned}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(b.hourly_rate)} / {formatMoney(b.daily_rate)} / {formatMoney(b.weekly_rate)}</td>
                    <td className="px-4 py-3"><Toggle label={b.is_active ? "Shown" : "Hidden"} checked={b.is_active} onChange={(v) => updateBikeFlags(b.id, { is_active: v })} /></td>
                    <td className="px-4 py-3"><Toggle label={b.is_featured ? "Yes" : "No"} checked={b.is_featured} onChange={(v) => updateBikeFlags(b.id, { is_featured: v })} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <ButtonLink to={`/admin/bikes/${b.id}`} variant="ghost" size="sm" aria-label={`Edit ${b.name}`}><Pencil size={15} /> Edit</ButtonLink>
                        <Button variant="ghost" size="sm" loading={busy === b.id} onClick={() => duplicate(b.id)} aria-label={`Duplicate ${b.name}`}><Copy size={15} /> Duplicate</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
