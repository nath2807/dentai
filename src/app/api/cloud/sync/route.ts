import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth-service";
import { cloudRepository } from "../../../../lib/cloud-repository";
import { syncBatchRequestSchema } from "../../../../lib/cloud-types";
import { safeErrorResponse } from "../../../../lib/security";
import { handleDatabaseError } from "../../../../lib/db-client";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return safeErrorResponse(401, "Authentication required for cloud sync.", "UNAUTHORIZED");
  }

  try {
    const body = await req.json();
    const parseResult = syncBatchRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid sync batch request.";
      return safeErrorResponse(400, errorMsg, "VALIDATION_ERROR");
    }

    if (parseResult.data.expectedUserId !== session.userId) {
      return safeErrorResponse(409, "The clinician session changed. Retry in the current account.", "AUTH_CONTEXT_CHANGED");
    }

    const syncResult = await cloudRepository.syncBatch(
      session.userId,
      parseResult.data,
      session.email
    );

    return NextResponse.json({
      success: true,
      ...syncResult,
    });
  } catch (err: unknown) {
    const dbErr = handleDatabaseError(err);
    if (dbErr) return dbErr;

    const message = err instanceof Error ? err.message : "Sync processing failed.";
    return safeErrorResponse(500, message, "SYNC_FAILED");
  }
}
