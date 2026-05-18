import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { uploadInvoiceToCloudinary } from "@/lib/cloudinary";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceOrder = {
  id: string;
  createdAt: Date;
  shippingAddress: Record<string, string>;
  subtotal: number;
  gstAmount: number;
  discountAmount: number;
  totalAmount: number;
  items: Array<{
    quantity: number;
    priceCharged: number;
    variant: { weight: string; product: { name: string } };
  }>;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 10, color: "#1a1a1a" },
  brand: { fontSize: 22, fontWeight: "bold", color: "#c2410c", marginBottom: 2 },
  tagline: { fontSize: 9, color: "#6b7280", marginBottom: 24 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  section: { marginBottom: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginVertical: 14 },
  label: { color: "#6b7280" },
  bold: { fontFamily: "Helvetica-Bold" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  c1: { flex: 3 },
  c2: { flex: 2 },
  c3: { flex: 1, textAlign: "right" },
  c4: { flex: 1.5, textAlign: "right" },
  c5: { flex: 1.5, textAlign: "right" },
  totalsBlock: { alignItems: "flex-end", marginTop: 8 },
  totalRow: { flexDirection: "row", width: 220, justifyContent: "space-between", marginBottom: 4 },
  footer: { marginTop: 40, textAlign: "center", color: "#9ca3af", fontSize: 9 },
});

// ─── Invoice component ────────────────────────────────────────────────────────

function InvoiceDoc({ order }: { order: InvoiceOrder }) {
  const fmt = (p: number) => `₹${(p / 100).toFixed(2)}`;
  const addr = order.shippingAddress;
  const invoiceNo = "INV-" + order.id.slice(0, 8).toUpperCase();
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.section}>
          <Text style={S.brand}>Leelas Homemade Spices</Text>
          <Text style={S.tagline}>Authentic Kerala flavours, delivered fresh</Text>
        </View>

        {/* Invoice meta + Customer */}
        <View style={S.row}>
          <View>
            <Text style={S.label}>Bill To</Text>
            <Text style={S.bold}>{addr.name}</Text>
            <Text>{addr.addressLine1}</Text>
            {addr.addressLine2 ? <Text>{addr.addressLine2}</Text> : null}
            <Text>
              {addr.city}, {addr.state} — {addr.pincode}
            </Text>
            <Text>Ph: {addr.phone}</Text>
          </View>
          <View>
            <Text style={S.bold}>{invoiceNo}</Text>
            <Text style={S.label}>{date}</Text>
          </View>
        </View>

        <View style={S.divider} />

        {/* Table header */}
        <View style={S.tableHeader}>
          <Text style={[S.c1, S.bold]}>Item</Text>
          <Text style={[S.c2, S.bold]}>Variant</Text>
          <Text style={[S.c3, S.bold]}>Qty</Text>
          <Text style={[S.c4, S.bold]}>Unit Price</Text>
          <Text style={[S.c5, S.bold]}>Total</Text>
        </View>

        {order.items.map((item, i) => (
          <View key={i} style={S.tableRow}>
            <Text style={S.c1}>{item.variant.product.name}</Text>
            <Text style={S.c2}>{item.variant.weight}</Text>
            <Text style={S.c3}>{item.quantity}</Text>
            <Text style={S.c4}>{fmt(item.priceCharged)}</Text>
            <Text style={S.c5}>{fmt(item.priceCharged * item.quantity)}</Text>
          </View>
        ))}

        <View style={S.divider} />

        {/* Totals */}
        <View style={S.totalsBlock}>
          <View style={S.totalRow}>
            <Text style={S.label}>Subtotal</Text>
            <Text>{fmt(order.subtotal)}</Text>
          </View>
          {order.discountAmount > 0 && (
            <View style={S.totalRow}>
              <Text style={S.label}>Discount</Text>
              <Text>- {fmt(order.discountAmount)}</Text>
            </View>
          )}
          <View style={S.totalRow}>
            <Text style={S.label}>GST (5%)</Text>
            <Text>{fmt(order.gstAmount)}</Text>
          </View>
          <View style={[S.totalRow, { marginTop: 8 }]}>
            <Text style={S.bold}>Grand Total</Text>
            <Text style={S.bold}>{fmt(order.totalAmount)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={S.footer}>
          <Text>Thank you for your order!</Text>
          <Text>support@leelas.in | leelas.in</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateInvoice(order: InvoiceOrder): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(<InvoiceDoc order={order} /> as any);
}

export async function generateAndUploadInvoice(
  order: InvoiceOrder
): Promise<string> {
  const buffer = await generateInvoice(order);
  return uploadInvoiceToCloudinary(buffer, order.id);
}
