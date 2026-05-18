import crypto from "crypto";
import Razorpay from "razorpay";

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID ?? "rzp_placeholder",
    key_secret: process.env.RAZORPAY_KEY_SECRET ?? "placeholder",
  });
}

export const razorpay = {
  get orders() { return getRazorpay().orders; },
  get payments() { return getRazorpay().payments; },
  get refunds() { return getRazorpay().refunds; },
};

export async function createRazorpayOrder(amountPaise: number, receiptId: string) {
  return razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: receiptId,
  });
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean {
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
