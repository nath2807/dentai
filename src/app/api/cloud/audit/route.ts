import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth-service";
import { cloudRepository } from "../../../../lib/cloud-repository";
import { safeErrorResponse } from "../../../../lib/security";
import { handleDatabaseError } from "../../../../lib/db-client";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return safeErrorResponse(401, "Authentication required to view audit trail.", "UNAUTHORIZED");
  }

  const { searchParams } = new URL(req.url);
  const caseId = searchParams.get("caseId") || undefined;

  try {
    const events = await cloudRepository.listAuditEvents(session.userId, caseId);
    return NextResponse.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (err: unknown) {
    const dbErr = handleDatabaseError(err);
    if (dbErr) return dbErr;

    const message = err instanceof Error ? err.message : "Failed to retrieve audit log.";
    return safeErrorResponse(500, message, "INTERNAL_ERROR");
  }
}
