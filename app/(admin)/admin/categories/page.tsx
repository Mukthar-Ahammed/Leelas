"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Tag,
  BarChart2,
  Link2,
  Trash2,
  Plus,
  Layers,
  FolderOpen,
  CheckCircle2,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? d))
      .finally(() => setLoading(false));
  }, []);

  function handleNameChange(val: string) {
    setNewName(val);
    setNewSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, slug: newSlug }),
    });
    const json = await res.json();
    if (res.ok) {
      const cat: Category = { ...(json.data ?? json), _count: { products: 0 } };
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewSlug("");
      setShowForm(false);
      setSuccessMsg(`Category "${cat.name}" created successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setCreateError(json.error ?? "Failed to create category");
    }
    setCreating(false);
  }

  async function deleteCategory(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    setBusyId(cat.id);
    setError(null);
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } else {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? "Failed to delete category");
    }
    setBusyId(null);
  }

  const totalProducts = categories.reduce((sum, c) => sum + c._count.products, 0);
  const emptyCategories = categories.filter((c) => c._count.products === 0).length;

  return (
    <div className="bg-white min-h-[calc(100vh-2rem)] p-10 text-slate-800 rounded-[2rem] shadow-sm">

      {/* Top Date Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <div className="bg-[#f0ebff] p-1.5 rounded-md">
            <Calendar className="w-5 h-5 text-[#6d28d9]" />
          </div>
          <span className="text-[15px]">
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Title & Add Button */}
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Categories</h1>
        <button
          onClick={() => { setShowForm((p) => !p); setCreateError(null); }}
          className="flex items-center gap-2 bg-[#6d28d9] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#5b21b6] transition-colors shadow-md shadow-[#6d28d9]/20"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Total Categories */}
        <div className="bg-[#f4f9ff] rounded-[1.5rem] p-7 border border-blue-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Total Categories</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#1e61c7]">{loading ? "—" : categories.length}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <Layers className="w-4 h-4" />
              <span>All groups</span>
            </div>
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-[#f3f0ff] rounded-[1.5rem] p-7 border border-purple-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Products Categorised</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#6d28d9]">{loading ? "—" : totalProducts}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <FolderOpen className="w-4 h-4" />
              <span>Across all</span>
            </div>
          </div>
        </div>

        {/* Empty Categories */}
        <div className="bg-[#fef4f1] rounded-[1.5rem] p-7 border border-orange-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Empty Categories</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#e14e21]">{loading ? "—" : emptyCategories}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <FolderOpen className="w-4 h-4" />
              <span>No products yet</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Category Form (collapsible) */}
      {showForm && (
        <div className="mb-8 bg-[#fafbff] border border-slate-100 rounded-[1.5rem] p-8">
          <h2 className="text-[15px] font-bold text-slate-800 mb-6">New Category</h2>
          <form onSubmit={createCategory} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                Name
              </label>
              <input
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Whole Spices"
                className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/30 focus:border-[#6d28d9] transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                Slug <span className="normal-case font-normal text-slate-400">(auto-filled)</span>
              </label>
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="e.g. whole-spices"
                className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-[14px] font-mono text-slate-500 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/30 focus:border-[#6d28d9] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!newName || creating}
              className="bg-[#6d28d9] text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-[#5b21b6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#6d28d9]/20"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </form>
          {createError && (
            <p className="text-red-500 text-sm font-semibold mt-3">{createError}</p>
          )}
        </div>
      )}

      {/* Success / Error banners */}
      {successMsg && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Categories Table */}
      <div className="w-full px-2">
        <table className="w-full text-[14px] text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-slate-800">
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Tag className="w-[18px] h-[18px] text-[#6d28d9]" /> Name
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Link2 className="w-[18px] h-[18px] text-[#1e61c7]" /> Slug
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-[18px] h-[18px] text-[#e14e21]" /> Products
                </div>
              </th>
              <th className="pb-6 font-bold text-right"></th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={4} className="border-b border-slate-100/60 pb-2"></td></tr>

            {loading && (
              <tr>
                <td colSpan={4} className="py-20 text-center font-bold text-slate-400">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && categories.length === 0 && (
              <tr>
                <td colSpan={4} className="py-20 text-center font-bold text-slate-400">
                  No categories yet. Click &quot;Add Category&quot; to create one.
                </td>
              </tr>
            )}

            {categories.map((cat) => (
              <tr key={cat.id} className="group">
                <td className="py-6 font-bold text-slate-800 border-b border-slate-50 group-last:border-0">
                  {cat.name}
                </td>
                <td className="py-6 font-mono text-[13px] text-slate-500 border-b border-slate-50 group-last:border-0">
                  {cat.slug}
                </td>
                <td className="py-6 border-b border-slate-50 group-last:border-0">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-bold ${
                    cat._count.products > 0
                      ? "bg-[#f0f9f1] text-[#15803d]"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    {cat._count.products > 0 && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {cat._count.products} product{cat._count.products !== 1 ? "s" : ""}
                  </span>
                </td>
                <td className="py-6 text-right border-b border-slate-50 group-last:border-0">
                  {cat._count.products > 0 ? (
                    <span
                      title="Reassign all products before deleting"
                      className="text-slate-300 text-sm font-bold cursor-not-allowed select-none"
                    >
                      Delete
                    </span>
                  ) : (
                    <button
                      onClick={() => deleteCategory(cat)}
                      disabled={busyId === cat.id}
                      className="flex items-center gap-1.5 ml-auto text-[#ef4444] hover:text-[#dc2626] text-sm font-bold transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                      {busyId === cat.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

