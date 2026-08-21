import { z } from "zod";

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.preprocess(
      (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
      z.email("Enter a valid email address"),
    ),
    phone: z.string().trim().min(8, "Enter a valid phone number").max(24),
    password: z.string().min(8, "Password must contain at least 8 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().min(8, "Enter a valid phone number").max(24),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  location: z.string().trim().min(2, "Select or enter your town/location").max(100),
  address: z.string().trim().min(4, "Enter a delivery address or meeting point").max(300),
  instructions: z.string().max(500).optional(),
  whatsappAvailable: z.boolean(),
  agreementAccepted: z.literal(true, { message: "Please accept the purchase agreement" }),
  signature: z.string().min(50, "Please sign in the signature box"),
});

export const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  phone: z.string().trim().min(8, "Enter a valid phone number"),
  message: z.string().trim().min(10, "Tell us how we can help").max(1500),
});
