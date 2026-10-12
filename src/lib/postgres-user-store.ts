/**
 * Dentarith PostgreSQL User Store.
 * Durable persistence for clinician accounts and authentication credentials.
 */
import crypto from "crypto";
import { type RegisterRequest, type UserProfile, type UserRecord } from "./auth-types";
import { hashPassword } from "./auth-service";
import { query, withTransaction, isDatabaseConfigured } from "./db-client";

export interface IUserStore {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(req: RegisterRequest): Promise<UserProfile>;
  clear(): Promise<void>;
}

export class PostgresUserStore implements IUserStore {
  constructor() {
    this.seedDefaultUsers();
  }

  private async seedDefaultUsers(): Promise<void> {
    if (!isDatabaseConfigured()) return;

    // Demo account is ONLY seeded in non-production or if explicitly enabled via ENABLE_DEMO_ACCOUNTS
    const isProduction = process.env.NODE_ENV === "production";
    const enableDemo = process.env.ENABLE_DEMO_ACCOUNTS === "true";
    if (isProduction && !enableDemo) {
      return;
    }

    try {
      const demoEmail = "dr.chen@dentarith.clinic";
      const existing = await this.findByEmail(demoEmail);
      if (existing) return;

      const { hash, salt } = hashPassword("ClinicalPassword123!");
      const demoId = "usr_clinical_demo_01";
      const now = new Date("2026-01-01T00:00:00Z").toISOString();

      await query(
        `INSERT INTO users (id, email, name, role, license_number, organization, password_hash, password_salt, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (email) DO NOTHING`,
        [
          demoId,
          demoEmail,
          "Dr. Sarah Chen, DDS",
          "clinician",
          "DDS-CA-98421",
          "Metropolitan Dental Group",
          hash,
          salt,
          now,
          now,
        ]
      );
    } catch {
      // Ignore seeding errors if tables are not yet migrated or DB is offline during startup
    }
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    const res = await query<{
      id: string;
      email: string;
      name: string;
      role: string;
      license_number: string | null;
      organization: string | null;
      password_hash: string;
      password_salt: string;
      created_at: Date | string;
      updated_at: Date | string;
    }>("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [normalized]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as UserRecord["role"],
      licenseNumber: row.license_number || undefined,
      organization: row.organization || undefined,
      passwordHash: row.password_hash,
      passwordSalt: row.password_salt,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  async findById(id: string): Promise<UserRecord | null> {
    const res = await query<{
      id: string;
      email: string;
      name: string;
      role: string;
      license_number: string | null;
      organization: string | null;
      password_hash: string;
      password_salt: string;
      created_at: Date | string;
      updated_at: Date | string;
    }>("SELECT * FROM users WHERE id = $1", [id]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as UserRecord["role"],
      licenseNumber: row.license_number || undefined,
      organization: row.organization || undefined,
      passwordHash: row.password_hash,
      passwordSalt: row.password_salt,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  async create(req: RegisterRequest): Promise<UserProfile> {
    const normalizedEmail = req.email.toLowerCase().trim();
    const id = `usr_${crypto.randomBytes(8).toString("hex")}`;
    const { hash, salt } = hashPassword(req.password);
    const now = new Date().toISOString();

    try {
      const res = await query<{
        id: string;
        email: string;
        name: string;
        role: string;
        license_number: string | null;
        organization: string | null;
        created_at: Date | string;
        updated_at: Date | string;
      }>(
        `INSERT INTO users (id, email, name, role, license_number, organization, password_hash, password_salt, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, email, name, role, license_number, organization, created_at, updated_at`,
        [
          id,
          normalizedEmail,
          req.name.trim(),
          "clinician",
          req.licenseNumber?.trim() || null,
          req.organization?.trim() || null,
          hash,
          salt,
          now,
          now,
        ]
      );

      const row = res.rows[0];
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role as UserProfile["role"],
        licenseNumber: row.license_number || undefined,
        organization: row.organization || undefined,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      };
    } catch (err: unknown) {
      if (err && typeof err === "object" && "originalError" in err) {
        const pgErr = (err as { originalError: { code?: string } }).originalError;
        if (pgErr?.code === "23505") {
          throw new Error("An account with this email address already exists.");
        }
      }
      if (err instanceof Error && err.message.toLowerCase().includes("unique")) {
        throw new Error("An account with this email address already exists.");
      }
      throw err;
    }
  }

  async clear(): Promise<void> {
    if (!isDatabaseConfigured()) return;
    await withTransaction(async (client) => {
      await client.query("DELETE FROM users");
    });
    await this.seedDefaultUsers();
  }
}
