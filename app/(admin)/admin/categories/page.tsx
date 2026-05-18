"use client";

import { useEffect, useState } from "react";

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

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Categories</h1>

      {/* Add category form */}
      <section className="border rounded-2xl p-6 mb-8">
        <h2 className="font-semibold text-lg mb-4">Add Category</h2>
        <form onSubmit={createCategory} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Name</label>
            <input
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Whole Spices"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
            />
          </div>
          <button
            type="submit"
            disabled={!newName || creating}
            className="bg-orange-700 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-orange-800 transition-colors disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
        {createError && <p className="text-red-600 text-xs mt-2">{createError}</p>}
      </section>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Categories table */}
      <div className="border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b">
            <tr>
              {["Name", "Slug", "Products", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{cat.name}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-3">{cat._count.products}</td>
                <td className="px-4 py-3 text-right">
                  {cat._count.products > 0 ? (
                    <span
                      title="Reassign all products before deleting"
                      className="text-muted-foreground/50 text-xs cursor-not-allowed select-none"
                    >
                      Delete
                    </span>
                  ) : (
                    <button
                      onClick={() => deleteCategory(cat)}
                      disabled={busyId === cat.id}
                      className="text-red-600 hover:underline text-xs disabled:opacity-40"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && categories.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No categories yet</p>
        )}
        {loading && (
          <p className="text-center py-12 text-muted-foreground">Loading…</p>
        )}
      </div>
    </div>
  );
}
