"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WishlistStore = {
  items: string[]; // variantIds
  addItem: (variantId: string) => void;
  removeItem: (variantId: string) => void;
  isInWishlist: (variantId: string) => boolean;
  toggle: (variantId: string) => void;
};

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (variantId) =>
        set((state) => ({ items: [...new Set([...state.items, variantId])] })),
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((id) => id !== variantId) })),
      isInWishlist: (variantId) => get().items.includes(variantId),
      toggle: (variantId) => {
        if (get().isInWishlist(variantId)) {
          get().removeItem(variantId);
        } else {
          get().addItem(variantId);
        }
      },
    }),
    { name: "leelas-wishlist" }
  )
);
