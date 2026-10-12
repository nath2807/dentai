import { z } from "zod";

export const UserRoleEnum = z.enum(["clinician", "admin", "auditor"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const userProfileSchema = z.object({
  id: z.string().min(1, "User ID is required."),
  email: z.string().email("Invalid email address.").toLowerCase().trim(),
  name: z.string().min(1, "Full name is required.").trim(),
  role: UserRoleEnum.default("clinician"),
  licenseNumber: z.string().trim().optional(),
  organization: z.string().trim().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const userRecordSchema = userProfileSchema.extend({
  passwordHash: z.string().min(1),
  passwordSalt: z.string().min(1),
});
export type UserRecord = z.infer<typeof userRecordSchema>;

export const registerRequestSchema = z.object({
  email: z.string().email("Please provide a valid email address.").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .max(100, "Password must not exceed 100 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  name: z.string().min(2, "Full name must be at least 2 characters long.").trim(),
  licenseNumber: z.string().trim().optional(),
  organization: z.string().trim().optional(),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email("Please provide a valid email address.").toLowerCase().trim(),
  password: z.string().min(1, "Password is required."),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  issuedAt: number;
  expiresAt: number;
}

export const AUTH_COOKIE_NAME = "dentarith_session";
export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days
