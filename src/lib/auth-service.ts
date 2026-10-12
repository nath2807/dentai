import crypto from "crypto";
import {
  type AuthSession,
  type LoginRequest,
  type RegisterRequest,
  type UserProfile,
  type UserRecord,
  AUTH_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "./auth-types";
import { PostgresUserStore, type IUserStore } from "./postgres-user-store";
import { isDatabaseConfigured, DatabaseConfigurationError } from "./db-client";

export { AUTH_COOKIE_NAME, SESSION_DURATION_SECONDS, type IUserStore };

// Server-side fallback secret for local development/testing only
const DEV_FALLBACK_SECRET = "dentarith_dev_secret_clinical_copilot_2026_uncompromised_hmac_key";

export function getAuthSecret(): string {
  const configured =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();

  if (process.env.NODE_ENV === "production") {
    if (!configured) {
      throw new Error(
        "Production configuration error: AUTH_SECRET must be set in production environment."
      );
    }
    if (configured.length < 32) {
      throw new Error(
        "Production configuration error: AUTH_SECRET must be at least 32 characters long."
      );
    }
    return configured;
  }

  return configured || DEV_FALLBACK_SECRET;
}

/**
 * Hash password with PBKDF2 using SHA-256 and a cryptographically secure random salt.
 */
export function hashPassword(
  password: string,
  existingSalt?: string
): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100_000, 32, "sha256")
    .toString("hex");
  return { hash, salt };
}

/**
 * Timing-safe verification of password against stored hash.
 */
export function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): boolean {
  try {
    const { hash } = hashPassword(password, storedSalt);
    const hashBuffer = Buffer.from(hash, "hex");
    const storedBuffer = Buffer.from(storedHash, "hex");
    if (hashBuffer.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(hashBuffer, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Create a cryptographically signed HMAC-SHA256 session token.
 * Token format: <base64Payload>.<hexSignature>
 */
export function signSessionToken(session: AuthSession, secret = getAuthSecret()): string {
  const payloadJson = JSON.stringify(session);
  const payloadB64 = Buffer.from(payloadJson, "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("hex");
  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 session token with timing-safe check and expiration validation.
 */
export function verifySessionToken(token: string, secret = getAuthSecret()): AuthSession | null {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [payloadB64, providedSignature] = token.split(".");
  if (!payloadB64 || !providedSignature) {
    return null;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadB64)
      .digest("hex");

    const providedBuffer = Buffer.from(providedSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (providedBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const session = JSON.parse(payloadJson) as AuthSession;

    const now = Math.floor(Date.now() / 1000);
    if (session.expiresAt && session.expiresAt < now) {
      return null; // Expired session
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * In-Memory Server User Store (Pluggable Provider Architecture).
 * Holds accounts in server memory; can be swapped or synced with PostgreSQL when configured.
 */
export class ServerUserStore implements IUserStore {
  private users = new Map<string, UserRecord>();
  private emailIndex = new Map<string, string>(); // lowercase email -> user id

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers() {
    // Demo account is ONLY seeded in non-production or if explicitly enabled via ENABLE_DEMO_ACCOUNTS
    const isProduction = process.env.NODE_ENV === "production";
    const enableDemo = process.env.ENABLE_DEMO_ACCOUNTS === "true";
    if (isProduction && !enableDemo) {
      return;
    }

    // Default vetted demonstration clinician
    const demoEmail = "dr.chen@dentarith.clinic";
    const { hash, salt } = hashPassword("ClinicalPassword123!");
    const demoUser: UserRecord = {
      id: "usr_clinical_demo_01",
      email: demoEmail,
      name: "Dr. Sarah Chen, DDS",
      role: "clinician",
      licenseNumber: "DDS-CA-98421",
      organization: "Metropolitan Dental Group",
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
      updatedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    };
    this.users.set(demoUser.id, demoUser);
    this.emailIndex.set(demoEmail, demoUser.id);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    const id = this.emailIndex.get(normalized);
    if (!id) return null;
    return this.users.get(id) || null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) || null;
  }

  async create(req: RegisterRequest): Promise<UserProfile> {
    const normalizedEmail = req.email.toLowerCase().trim();
    if (this.emailIndex.has(normalizedEmail)) {
      throw new Error("An account with this email address already exists.");
    }

    const id = `usr_${crypto.randomBytes(8).toString("hex")}`;
    const { hash, salt } = hashPassword(req.password);
    const now = new Date().toISOString();

    const userRecord: UserRecord = {
      id,
      email: normalizedEmail,
      name: req.name.trim(),
      role: "clinician",
      licenseNumber: req.licenseNumber?.trim(),
      organization: req.organization?.trim(),
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, userRecord);
    this.emailIndex.set(normalizedEmail, id);

    // Return safe profile without password fields
    return {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      role: userRecord.role,
      licenseNumber: userRecord.licenseNumber,
      organization: userRecord.organization,
      createdAt: userRecord.createdAt,
      updatedAt: userRecord.updatedAt,
    };
  }

  async clear() {
    this.users.clear();
    this.emailIndex.clear();
    this.seedDefaultUsers();
  }
}

// Global cache references on globalThis
interface GlobalUserStoreCache {
  __dentarith_pg_user_store__?: PostgresUserStore;
  __dentarith_in_memory_user_store__?: ServerUserStore;
}

const globalUserCache = globalThis as unknown as GlobalUserStoreCache;

/**
 * Factory returning active user store.
 * FAIL-CLOSED: In production, missing DATABASE_URL throws immediately without falling back to memory.
 */
export function getUserStore(): IUserStore {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!isDatabaseConfigured()) {
      throw new DatabaseConfigurationError(
        "CRITICAL SECURITY CONFIGURATION ERROR: Authentication persistence is enabled in production, but DATABASE_URL is not configured. Failing closed."
      );
    }
    if (!globalUserCache.__dentarith_pg_user_store__) {
      globalUserCache.__dentarith_pg_user_store__ = new PostgresUserStore();
    }
    return globalUserCache.__dentarith_pg_user_store__;
  }

  // Development / Test environments
  if (isDatabaseConfigured()) {
    if (!globalUserCache.__dentarith_pg_user_store__) {
      globalUserCache.__dentarith_pg_user_store__ = new PostgresUserStore();
    }
    return globalUserCache.__dentarith_pg_user_store__;
  }

  // Isolated in-memory test adapter for offline tests and local development
  if (!globalUserCache.__dentarith_in_memory_user_store__) {
    globalUserCache.__dentarith_in_memory_user_store__ = new ServerUserStore();
  }
  return globalUserCache.__dentarith_in_memory_user_store__;
}

/**
 * Dynamic proxy providing the IUserStore contract across authentication routes.
 */
export const userStore: IUserStore = new Proxy({} as IUserStore, {
  get(_target, prop) {
    const store = getUserStore();
    const val = (store as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === "function") {
      return (val as (...args: unknown[]) => unknown).bind(store);
    }
    return val;
  },
});


/**
 * Authenticate login credentials and return session token.
 */
export async function authenticateUser(
  req: LoginRequest
): Promise<{ user: UserProfile; token: string }> {
  const user = await userStore.findByEmail(req.email);
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isValid = verifyPassword(req.password, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    throw new Error("Invalid email or password.");
  }

  const now = Math.floor(Date.now() / 1000);
  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_SECONDS,
  };

  const token = signSessionToken(session);
  const userProfile: UserProfile = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    licenseNumber: user.licenseNumber,
    organization: user.organization,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { user: userProfile, token };
}

/**
 * Extract and verify session from HTTP Request (cookies or Authorization header).
 */
export async function getSessionFromRequest(req: Request): Promise<AuthSession | null> {
  let token: string | undefined;

  // 1. Try reading HTTP Cookie
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const sessionCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    if (sessionCookie) {
      token = sessionCookie.split("=")[1];
    }
  }

  // 2. Try reading Authorization Bearer header
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

/**
 * Build HTTP-only, SameSite=Strict cookie header string.
 */
export function buildSessionCookie(token: string, maxAge = SESSION_DURATION_SECONDS): string {
  const isSecure = process.env.NODE_ENV === "production";
  return `${AUTH_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${
    isSecure ? "; Secure" : ""
  }`;
}

/**
 * Build expired session cookie header string to clear session on logout.
 */
export function buildLogoutCookie(): string {
  const isSecure = process.env.NODE_ENV === "production";
  return `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${
    isSecure ? "; Secure" : ""
  }`;
}
