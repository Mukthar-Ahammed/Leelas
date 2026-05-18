"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  category: { name: string };
  variants: { id: string }[];
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/products/list")
      .then((r) => r.json())
      .then((d) => setProducts(d.data ?? d))
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(product: Product) {
    const action = product.isActive ? "Hide from store" : "Show in store";
    if (!confirm(`${action} "${product.name}"?`)) return;
    setBusyId(product.id);
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id, isActive: !product.isActive }),
    });
    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: !p.isActive } : p))
      );
    }
    setBusyId(null);
  }

  async function hardDelete(product: Product) {
    if (!confirm(`Permanently delete "${product.name}"? This cannot be undone.`)) return;
    setBusyId(product.id);
    setError(null);
    const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } else {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? "Failed to delete product");
    }
    setBusyId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <a
          href="/admin/products/new"
          className="bg-orange-700 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-800 transition-colors"
        >
          Add Product
        </a>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b">
            <tr>
              {["Name", "Category", "Variants", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p.id} className={`hover:bg-muted/20 ${!p.isActive ? "opacity-60" : ""}`}>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.category.name}</td>
                <td className="px-4 py-3">{p.variants.length}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <a href={`/admin/products/${p.id}`} className="text-orange-700 hover:underline">
                      Edit
                    </a>
                    <button
                      onClick={() => toggleActive(p)}
                      disabled={busyId === p.id}
                      className={`hover:underline disabled:opacity-40 ${
                        p.isActive ? "text-amber-600" : "text-green-600"
                      }`}
                    >
                      {p.isActive ? "Hide from store" : "Show in store"}
                    </button>
                    <button
                      onClick={() => hardDelete(p)}
                      disabled={busyId === p.id}
                      className="text-red-600 hover:underline disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && products.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No products yet</p>
        )}
        {loading && (
          <p className="text-center py-12 text-muted-foreground">Loading…</p>
        )}
      </div>
    </div>
  );
}
