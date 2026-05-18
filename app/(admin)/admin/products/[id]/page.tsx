"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Package, ImageIcon, Layers, Percent,
  CheckCircle2, Plus, Trash2, Save,
} from "lucide-react";

function startOfDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}
function endOfDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

const editSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().min(1, "Description is required").min(10, "Must be at least 10 characters"),
  ingredients: z.string().optional(),
  usageSuggestions: z.string().optional(),
  isActive: z.boolean(),
  categoryId: z.string().min(1, "Please select a category"),
});
type EditInput = z.infer<typeof editSchema>;
type Category = { id: string; name: string };
type Variant = { id: string; weight: string; sku: string; retailPrice: number; wholesalePrice: number; stock: number };
type ServerImage = { id: string; url: string; altText: string | null; order: number; publicId: string | null };
type ImageItem =
  | { kind: "server"; id: string; url: string; altText: string | null }
  | { kind: "pending"; localId: string; file: File; previewUrl: string };
type Product = {
  id: string; name: string; slug: string; description: string;
  ingredients: string | null; usageSuggestions: string | null;
  isActive: boolean; categoryId: string;
  category: { id: string; name: string };
  variants: Variant[]; images: ServerImage[];
  offerPercent: number | null; offerStartsAt: string | null; offerEndsAt: string | null;
};

const inputCls = "w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/30 focus:border-[#6d28d9] transition-all";
const labelCls = "block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider";
const errorCls = "text-red-500 text-xs font-semibold mt-1";
const sectionCls = "bg-[#fafbff] border border-slate-100 rounded-[1.5rem] p-8 space-y-5";

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-9 h-9 rounded-xl bg-[#f0ebff] flex items-center justify-center">{icon}</div>
      <h2 className="text-[17px] font-extrabold text-slate-800">{title}</h2>
    </div>
  );
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [toDelete, setToDelete] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [offerPercent, setOfferPercent] = useState("");
  const [offerStartsAt, setOfferStartsAt] = useState("");
  const [offerEndsAt, setOfferEndsAt] = useState("");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<EditInput>({ resolver: zodResolver(editSchema) });
  const isActive = watch("isActive");

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.data ?? d));
  }, []);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((data: Product) => {
        setProduct(data);
        setVariants(data.variants);
        setImageItems((data.images ?? []).map((img) => ({ kind: "server" as const, id: img.id, url: img.url, altText: img.altText })));
        if (data.offerPercent) {
          setOfferEnabled(true);
          setOfferPercent(String(data.offerPercent));
          setOfferStartsAt(data.offerStartsAt ? data.offerStartsAt.slice(0, 10) : "");
          setOfferEndsAt(data.offerEndsAt ? data.offerEndsAt.slice(0, 10) : "");
        }
        reset({ name: data.name, description: data.description, ingredients: data.ingredients ?? "", usageSuggestions: data.usageSuggestions ?? "", isActive: data.isActive, categoryId: data.categoryId });
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id, reset]);

  function handleNewCatName(val: string) {
    setNewCatName(val);
    setNewCatSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  async function createCategory() {
    setCreatingCat(true);
    const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCatName, slug: newCatSlug }) });
    const json = await res.json();
    if (res.ok) {
      const cat: Category = json.data ?? json;
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setShowNewCat(false); setNewCatName(""); setNewCatSlug("");
      setTimeout(() => setValue("categoryId", cat.id, { shouldValidate: true }), 0);
    }
    setCreatingCat(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const newItems: ImageItem[] = files.map((file) => ({ kind: "pending", localId: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }));
    setImageItems((prev) => [...prev, ...newItems]);
  }

  function removeImage(item: ImageItem) {
    if (item.kind === "server") { setToDelete((prev) => [...prev, item.id]); }
    else { URL.revokeObjectURL(item.previewUrl); }
    setImageItems((prev) => prev.filter((i) => (i.kind === "server" ? i.id !== item.id : i.localId !== item.localId)));
  }

  function handleDrop(toIndex: number) {
    if (dragIndex === null || dragIndex === toIndex) return;
    setImageItems((prev) => { const next = [...prev]; const [moved] = next.splice(dragIndex, 1); next.splice(toIndex, 0, moved); return next; });
    setDragIndex(null);
  }

  async function onSubmit(data: EditInput) {
    setError(null); setSuccess(false);
    const offerPayload = offerEnabled && offerPercent
      ? { offerPercent: parseInt(offerPercent), offerStartsAt: offerStartsAt ? startOfDay(offerStartsAt) : null, offerEndsAt: offerEndsAt ? endOfDay(offerEndsAt) : null }
      : { offerPercent: null, offerStartsAt: null, offerEndsAt: null };

    const res = await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data, ...offerPayload }) });
    if (!res.ok) { try { const json = await res.json(); setError(typeof json.error === "string" ? json.error : "Failed to update product"); } catch { setError("Failed to update product"); } return; }

    for (const imageId of toDelete) { await fetch(`/api/products/${product!.slug}/images/${imageId}`, { method: "DELETE" }); }
    setToDelete([]);

    const finalOrder: string[] = [];
    for (const item of imageItems) {
      if (item.kind === "server") { finalOrder.push(item.id); }
      else { const fd = new FormData(); fd.append("image", item.file); const uploadRes = await fetch(`/api/products/${product!.slug}/images`, { method: "POST", body: fd }); const uploadJson = await uploadRes.json(); if (uploadRes.ok) finalOrder.push((uploadJson.data ?? uploadJson).id); }
    }
    if (finalOrder.length > 0) {
      await fetch(`/api/products/${product!.slug}/images/reorder`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: finalOrder.map((id, i) => ({ id, order: i })) }) });
      setImageItems(finalOrder.map((id) => { const existing = imageItems.find((item) => item.kind === "server" && item.id === id); return existing as ImageItem ?? { kind: "server", id, url: "", altText: null }; }));
    }
    setSuccess(true);
    router.refresh();
  }

  async function updateVariant(variantId: string, field: keyof Variant, raw: string) {
    const value = field === "stock" || field === "retailPrice" || field === "wholesalePrice" ? field === "stock" ? parseInt(raw) : Math.round(parseFloat(raw) * 100) : raw;
    setVariants((prev) => prev.map((v) => v.id === variantId ? { ...v, [field]: value } : v));
  }

  async function saveVariant(variantId: string) {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return;
    await fetch("/api/admin/products/variants", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(variant) });
  }

  async function hardDelete() {
    if (!confirm("Permanently delete this product? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!res.ok) { const json = await res.json().catch(() => null); setError(json?.error ?? "Failed to delete product"); return; }
    router.push("/admin/products");
    router.refresh();
  }

  if (loading) return <div className="py-20 text-center font-bold text-slate-400">Loading…</div>;
  if (!product) return <div className="py-20 text-center font-bold text-red-400">Product not found.</div>;

  return (
    <div className="bg-white min-h-[calc(100vh-2rem)] p-10 rounded-[2rem] shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <a href="/admin/products" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-[14px] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Products
          </a>
          <span className="text-slate-200">/</span>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Edit Product</h1>
        </div>
        <button onClick={hardDelete}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-500 text-[13px] font-bold hover:bg-red-100 transition-colors">
          <Trash2 className="w-4 h-4" /> Delete permanently
        </button>
      </div>

      {error && <div className="mb-6 px-5 py-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold">{error}</div>}
      {success && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5" /> Product updated successfully.
        </div>
      )}

      <div className="space-y-6 max-w-3xl">

        {/* ── Images (outside form) ─────────────────────────────── */}
        <div className={sectionCls}>
          <SectionTitle icon={<ImageIcon className="w-4 h-4 text-[#6d28d9]" />} title="Images" />
          <p className="text-[13px] text-slate-400 font-semibold -mt-2">Drag to reorder. First image is the cover. Saved with Save Changes.</p>
          <div className="grid grid-cols-5 gap-3">
            {imageItems.map((item, i) => {
              const url = item.kind === "server" ? item.url : item.previewUrl;
              const alt = item.kind === "server" ? (item.altText ?? "") : "";
              const key = item.kind === "server" ? item.id : item.localId;
              return (
                <div key={key} draggable onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(i)} onDragEnd={() => setDragIndex(null)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-opacity ${dragIndex === i ? "opacity-40 border-[#6d28d9]" : "border-transparent"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={alt} className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] bg-[#6d28d9] text-white px-1.5 py-0.5 rounded-md font-bold">Cover</span>}
                  {item.kind === "pending" && <span className="absolute bottom-1 right-1 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-md font-bold">New</span>}
                  <button type="button" onClick={() => removeImage(item)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors">×</button>
                </div>
              );
            })}
            <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#6d28d9] hover:bg-[#f3f0ff]/30 transition-colors">
              <Plus className="w-5 h-5 text-slate-300" />
              <span className="text-[11px] text-slate-400 font-bold mt-1">Add photo</span>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="sr-only" onChange={handleFileSelect} />
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Basic Info ───────────────────────────────────────── */}
          <div className={sectionCls}>
            <SectionTitle icon={<Package className="w-4 h-4 text-[#6d28d9]" />} title="Basic Information" />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}>Category</label>
                <button type="button" onClick={() => setShowNewCat((s) => !s)}
                  className="text-[12px] font-bold text-[#6d28d9] hover:underline">
                  {showNewCat ? "Cancel" : "+ New category"}
                </button>
              </div>
              <select {...register("categoryId")} className={inputCls}>
                <option value="">Select a category…</option>
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              {errors.categoryId && <p className={errorCls}>{errors.categoryId.message}</p>}
              {showNewCat && (
                <div className="mt-4 p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Category</p>
                  <input value={newCatName} onChange={(e) => handleNewCatName(e.target.value)} className={inputCls} placeholder="e.g. Whole Spices" />
                  <button type="button" disabled={!newCatName || !newCatSlug || creatingCat} onClick={createCategory}
                    className="bg-[#6d28d9] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#5b21b6] disabled:opacity-50 transition-colors">
                    {creatingCat ? "Creating…" : "Create Category"}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>Product Name</label>
              <input {...register("name")} className={inputCls} />
              {errors.name && <p className={errorCls}>{errors.name.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea {...register("description")} rows={4} className={inputCls} />
              {errors.description && <p className={errorCls}>{errors.description.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Ingredients</label>
              <textarea {...register("ingredients")} rows={2} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Usage Suggestions</label>
              <textarea {...register("usageSuggestions")} rows={2} className={inputCls} />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-[14px] font-bold text-slate-700">Visible on store</p>
                <p className="text-[12px] text-slate-400 font-semibold mt-0.5">Customers will {isActive ? "see" : "not see"} this product</p>
              </div>
              <button type="button" onClick={() => setValue("isActive", !isActive)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isActive ? "bg-[#6d28d9]" : "bg-slate-200"}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          {/* ── Variants ─────────────────────────────────────────── */}
          <div className={sectionCls}>
            <SectionTitle icon={<Layers className="w-4 h-4 text-[#6d28d9]" />} title="Variants" />
            <p className="text-[13px] text-slate-400 font-semibold -mt-2">Edit prices and stock, then click Save on each row.</p>
            <div className="space-y-4">
              {variants.map((v) => (
                <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-bold text-slate-700">{v.weight}</span>
                    <span className="text-[12px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">{v.sku}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Retail Price (₹)</label>
                      <input type="number" step="0.01" min={0} defaultValue={(v.retailPrice / 100).toFixed(2)}
                        onChange={(e) => updateVariant(v.id, "retailPrice", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Wholesale Price (₹)</label>
                      <input type="number" step="0.01" min={0} defaultValue={(v.wholesalePrice / 100).toFixed(2)}
                        onChange={(e) => updateVariant(v.id, "wholesalePrice", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Stock (units)</label>
                      <input type="number" min={0} defaultValue={v.stock}
                        onChange={(e) => updateVariant(v.id, "stock", e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <button type="button" onClick={() => saveVariant(v.id)}
                    className="flex items-center gap-1.5 text-[12px] font-bold text-[#6d28d9] bg-[#f3f0ff] px-4 py-2 rounded-xl hover:bg-[#ede9fe] transition-colors">
                    <Save className="w-3.5 h-3.5" /> Save variant
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Offer / Sale ──────────────────────────────────────── */}
          <div className={sectionCls}>
            <div className="flex items-center justify-between">
              <SectionTitle icon={<Percent className="w-4 h-4 text-[#6d28d9]" />} title="Offer Price" />
              <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${offerEnabled ? "bg-[#6d28d9]" : "bg-slate-200"}`}
                onClick={() => setOfferEnabled((v) => !v)}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${offerEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </div>
            </div>
            {offerEnabled && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Discount %</label>
                  <input type="number" min={1} max={99} value={offerPercent}
                    onChange={(e) => setOfferPercent(e.target.value)} placeholder="e.g. 20" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Starts (optional)</label>
                  <input type="date" value={offerStartsAt} onChange={(e) => setOfferStartsAt(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ends</label>
                  <input type="date" value={offerEndsAt} onChange={(e) => setOfferEndsAt(e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
          </div>

          {/* ── Actions ──────────────────────────────────────────── */}
          <div className="flex items-center gap-4 pt-2">
            <button type="submit" disabled={isSubmitting}
              className="flex items-center gap-2 bg-[#6d28d9] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#5b21b6] transition-colors disabled:opacity-60 shadow-md shadow-[#6d28d9]/20">
              {isSubmitting ? "Saving…" : <><CheckCircle2 className="w-4 h-4" /> Save Changes</>}
            </button>
            <a href="/admin/products"
              className="px-8 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-[14px]">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
