import { z } from "zod";

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email too long" }),
  password: z.string().min(1, { message: "Password is required" }).max(100, { message: "Password too long" }),
});

export const signupSchema = z.object({
  fullName: z.string().trim().min(1, { message: "Full name is required" }).max(100, { message: "Name too long" }),
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email too long" }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(100, { message: "Password too long" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" }),
  countryCode: z.string().trim().max(5, { message: "Country code too long" }).optional(),
  phoneNumber: z.string().trim().max(20, { message: "Phone number too long" }).optional(),
  termsAccepted: z.boolean().refine((val) => val === true, { message: "You must accept the terms and conditions" }),
});

// Trading signal schemas
export const signalSchema = z.object({
  pair: z.string().trim().min(1, { message: "Pair is required" }).max(50, { message: "Pair name too long" }),
  type: z.enum(["Buy", "Sell"], { message: "Type must be Buy or Sell" }),
  category: z.string().trim().min(1, { message: "Category is required" }).max(50),
  main_category: z.string().trim().min(1, { message: "Main category is required" }).max(50),
  sub_category: z.string().trim().max(50).optional(),
  entry: z.string().trim().min(1, { message: "Entry is required" }).max(100),
  tp1: z.string().trim().min(1, { message: "TP1 is required" }).max(100),
  tp2: z.string().trim().max(100).optional().or(z.literal("")),
  tp3: z.string().trim().max(100).optional().or(z.literal("")),
  sl: z.string().trim().min(1, { message: "Stop Loss is required" }).max(100),
  note: z.string().trim().max(1000, { message: "Note must be less than 1000 characters" }).optional(),
  profit_note: z.string().trim().max(200).optional().or(z.literal("")),
  status: z.string().optional(),
  signal_status: z.string().optional(),
});

// Chart analysis schema
export const chartAnalysisSchema = z.object({
  title: z.string().trim().min(1, { message: "Title is required" }).max(200, { message: "Title too long" }),
  description: z.string().trim().max(2000, { message: "Description must be less than 2000 characters" }).optional(),
  image_url: z.string().trim().url({ message: "Invalid image URL" }),
});
