const GST_RATE = 0.05;

export function calculateGST(subtotalPaise: number): {
  gstAmount: number;
  total: number;
} {
  const gstAmount = Math.round(subtotalPaise * GST_RATE);
  return {
    gstAmount,
    total: subtotalPaise + gstAmount,
  };
}
