import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth-service";
import { cloudRepository } from "../../../../lib/cloud-repository";
import { migrationRequestSchema } from "../../../../lib/cloud-types";
import { safeErrorResponse } from "../../../../lib/security";
import { handleDatabaseError } from "../../../../lib/db-client";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return safeErrorResponse(
      401,
      "Authentication required to migrate local clinical cases to cloud.",
      "UNAUTHORIZED"
    );
  }

  try {
    const body = await req.json();
    const parseResult = migrationRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg =
        parseResult.error.issues[0]?.message || "Invalid migration request payload.";
      return safeErrorResponse(400, errorMsg, "VALIDATION_ERROR");
    }

    if (parseResult.data.expectedUserId !== session.userId) {
      return safeErrorResponse(409, "The clinician session changed. Retry in the current account.", "AUTH_CONTEXT_CHANGED");
    }

    const result = await cloudRepository.migrateBatch(
      session.userId,
      session.email,
      parseResult.data
    );

    return NextResponse.json({
      success: true,
      userId: session.userId,
      ...result,
    });
  } catch (err: unknown) {
    const dbErr = handleDatabaseError(err);
    if (dbErr) return dbErr;

    const message = err instanceof Error ? err.message : "Migration failed.";
    return safeErrorResponse(500, message, "MIGRATION_FAILED");
  }
}
