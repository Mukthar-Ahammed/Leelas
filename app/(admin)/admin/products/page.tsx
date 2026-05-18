"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Package,
  CheckCircle2,
  EyeOff,
  Tag,
  Layers,
  BarChart2,
  Pencil,
  Trash2,
  Eye,
  EyeOffIcon,
  Plus,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  category: { name: string };
  variants: { id: string; weight: string; retailPrice: number; stock: number }[];
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

  const totalProducts = products.length;
  const activeCount = products.filter((p) => p.isActive).length;
  const inactiveCount = products.filter((p) => !p.isActive).length;

  return (
    <div className="bg-white min-h-[calc(100vh-2rem)] p-10 text-slate-800 rounded-[2rem] shadow-sm">

      {/* Date Header */}
      <div className="flex items-center gap-2 text-slate-800 font-semibold mb-10">
        <div className="bg-[#f0ebff] p-1.5 rounded-md">
          <Calendar className="w-5 h-5 text-[#6d28d9]" />
        </div>
        <span className="text-[15px]">
          {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Title & Add Button */}
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Products</h1>
        <a
          href="/admin/products/new"
          className="flex items-center gap-2 bg-[#6d28d9] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#5b21b6] transition-colors shadow-md shadow-[#6d28d9]/20"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </a>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
        <div className="bg-[#f4f9ff] rounded-[1.5rem] p-7 border border-blue-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Total Products</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#1e61c7]">
              {loading ? "—" : totalProducts}
            </span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <Package className="w-4 h-4" />
              <span>In catalogue</span>
            </div>
          </div>
        </div>

        <div className="bg-[#f0fdf4] rounded-[1.5rem] p-7 border border-green-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Live in Store</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#15803d]">
              {loading ? "—" : activeCount}
            </span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <CheckCircle2 className="w-4 h-4" />
              <span>Active listings</span>
            </div>
          </div>
        </div>

        <div className="bg-[#fef4f1] rounded-[1.5rem] p-7 border border-orange-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Hidden</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#e14e21]">
              {loading ? "—" : inactiveCount}
            </span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <EyeOff className="w-4 h-4" />
              <span>Not visible</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="w-full px-2">
        <table className="w-full text-[14px] text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-slate-800">
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Package className="w-[18px] h-[18px] text-[#6d28d9]" /> Name
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Tag className="w-[18px] h-[18px] text-[#1e61c7]" /> Category
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Layers className="w-[18px] h-[18px] text-[#e14e21]" /> Variants
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-[18px] h-[18px] text-slate-400" /> Status
                </div>
              </th>
              <th className="pb-6 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="border-b border-slate-100/60 pb-2"></td>
            </tr>

            {loading && (
              <tr>
                <td colSpan={5} className="py-20 text-center font-bold text-slate-400">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center font-bold text-slate-400">
                  No products yet. Click &quot;Add Product&quot; to create one.
                </td>
              </tr>
            )}

            {products.map((p) => {
              const lowestPrice = p.variants.length
                ? Math.min(...p.variants.map((v) => v.retailPrice))
                : null;
              const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);

              return (
                <tr
                  key={p.id}
                  className={`group transition-opacity ${!p.isActive ? "opacity-50" : ""}`}
                >
                  {/* Name */}
                  <td className="py-5 border-b border-slate-50 group-last:border-0">
                    <div className="font-bold text-slate-800">{p.name}</div>
                    <div className="text-[12px] font-mono text-slate-400 mt-0.5">{p.slug}</div>
                  </td>

                  {/* Category */}
                  <td className="py-5 border-b border-slate-50 group-last:border-0">
                    <span className="inline-flex px-3 py-1 rounded-full text-[12px] font-bold bg-[#f3f0ff] text-[#6d28d9]">
                      {p.category.name}
                    </span>
                  </td>

                  {/* Variants */}
                  <td className="py-5 border-b border-slate-50 group-last:border-0">
                    <div className="font-bold text-slate-700">
                      {p.variants.length} variant{p.variants.length !== 1 ? "s" : ""}
                    </div>
                    {lowestPrice !== null && (
                      <div className="text-[12px] font-semibold text-slate-400 mt-0.5">
                        from ₹{(lowestPrice / 100).toFixed(0)} · {totalStock} in stock
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-5 border-b border-slate-50 group-last:border-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold ${
                        p.isActive
                          ? "bg-[#f0fdf4] text-[#15803d]"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {p.isActive ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOffIcon className="w-3.5 h-3.5" />
                      )}
                      {p.isActive ? "Active" : "Hidden"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-5 text-right border-b border-slate-50 group-last:border-0">
                    <div className="flex items-center justify-end gap-3">
                      <a
                        href={`/admin/products/${p.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f3f0ff] text-[#6d28d9] text-[12px] font-bold hover:bg-purple-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </a>
                      <button
                        onClick={() => toggleActive(p)}
                        disabled={busyId === p.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-colors disabled:opacity-40 ${
                          p.isActive
                            ? "bg-[#fffbf0] text-[#d97706] hover:bg-amber-100"
                            : "bg-[#f0fdf4] text-[#15803d] hover:bg-green-100"
                        }`}
                      >
                        {p.isActive ? (
                          <><EyeOff className="w-3.5 h-3.5" /> Hide</>
                        ) : (
                          <><Eye className="w-3.5 h-3.5" /> Show</>
                        )}
                      </button>
                      <button
                        onClick={() => hardDelete(p)}
                        disabled={busyId === p.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fef4f1] text-[#e14e21] text-[12px] font-bold hover:bg-red-100 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
