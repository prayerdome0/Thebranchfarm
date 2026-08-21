import { z } from "zod";
import { ANIMAL_TYPES, HEALTH_RECORD_TYPES } from "@/lib/constants";

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

export const loginSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.email("Enter a valid email address"),
  ),
  password: z.string().min(1, "Enter your password").max(128),
});

export const resetSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.email("Enter a valid email address"),
  ),
});

const optionalDate = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")])
  .optional();

const optionalNumber = z
  .union([z.literal(""), z.string().regex(/^\d*(\.\d+)?$/, "Enter a valid number")])
  .optional();

export const animalSchema = z.object({
  animalId: z.string().trim().min(1, "Enter the animal ID or tag number").max(80),
  tagNumber: z.string().trim().max(120).optional(),
  name: z.string().trim().max(120).optional(),
  animalType: z.enum(ANIMAL_TYPES.map((t) => t.value) as [string, ...string[]]),
  breed: z.string().trim().min(1, "Enter the breed").max(100),
  sex: z.enum(["male", "female"]),
  dateOfBirth: optionalDate,
  datePurchased: optionalDate,
  purchasePrice: optionalNumber,
  supplier: z.string().trim().max(150).optional(),
  location: z.string().trim().min(1, "Enter the current location").max(150),
  weight: optionalNumber,
  status: z.enum(["active", "sold", "deceased", "transferred"]),
  healthStatus: z.enum([
    "healthy",
    "under-observation",
    "sick",
    "injured",
    "recovering",
  ]),
  notes: z.string().max(3000).optional(),
});

export const healthRecordSchema = z.object({
  animalId: z.string().min(1, "Select the animal"),
  type: z.enum(HEALTH_RECORD_TYPES.map((t) => t.value) as [string, ...string[]]),
  problem: z.string().trim().min(2, "Describe the problem or observation").max(500),
  observation: z.string().trim().max(2000).optional(),
  actionTaken: z.string().trim().max(2000).optional(),
  medication: z.string().trim().max(300).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date"),
  nextDate: optionalDate,
  notes: z.string().max(3000).optional(),
});

export const activitySchema = z.object({
  activity: z.string().trim().min(1, "Choose the activity").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date"),
  time: z.string().max(5).optional(),
  location: z.string().trim().max(150).optional(),
  notes: z.string().trim().min(2, "Add a note about this activity").max(2000),
});

export const documentSchema = z.object({
  name: z.string().trim().min(2, "Enter a name for this document").max(200),
  description: z.string().trim().max(1000).optional(),
  relatedAnimalId: z.string().optional(),
});

export const staffSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the full name").max(100),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.email("Enter a valid email address"),
  ),
  phone: z.string().trim().min(8, "Enter a valid phone number").max(24),
  title: z.string().trim().max(100).optional(),
  role: z.enum(["staff", "admin"]),
});

export const settingsSchema = z.object({
  farmName: z.string().trim().min(2, "Enter the farm name").max(100),
  slogan: z.string().trim().max(100).optional(),
  location: z.string().trim().min(2, "Enter the farm location").max(200),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  email: z.string().trim().max(200).optional(),
  currency: z.string().trim().min(1, "Enter a currency symbol").max(5),
});
