import { z } from "zod";

export const shippingAddressSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  addressLine1: z.string().min(5, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string(),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
});

export const orderCreateSchema = z.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(["COD", "ONLINE"]),
  referralCode: z.string().optional(),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

// backward-compat alias
export const checkoutSchema = orderCreateSchema;
export type CheckoutInput = OrderCreateInput;
