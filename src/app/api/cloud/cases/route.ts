import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth-service";
import { cloudRepository } from "../../../../lib/cloud-repository";
import { safeErrorResponse } from "../../../../lib/security";
import { handleDatabaseError } from "../../../../lib/db-client";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return safeErrorResponse(401, "Authentication required to access cloud cases.", "UNAUTHORIZED");
  }

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") || undefined;
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

  try {
    const cases = await cloudRepository.listCases(session.userId, { since, limit, offset });
    return NextResponse.json({
      success: true,
      count: cases.length,
      cases,
    });
  } catch (err: unknown) {
    const dbErr = handleDatabaseError(err);
    if (dbErr) return dbErr;

    const message = err instanceof Error ? err.message : "Failed to fetch cloud cases.";
    return safeErrorResponse(500, message, "INTERNAL_ERROR");
  }
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return safeErrorResponse(401, "Authentication required to create cloud case.", "UNAUTHORIZED");
  }

  try {
    const body = await req.json();
    if (!body || !body.caseData) {
      return safeErrorResponse(400, "Invalid payload: caseData is required.", "VALIDATION_ERROR");
    }

    const created = await cloudRepository.createCase(session.userId, body, session.email);
    return NextResponse.json(
      {
        success: true,
        case: created,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const dbErr = handleDatabaseError(err);
    if (dbErr) return dbErr;

    const message = err instanceof Error ? err.message : "Failed to create cloud case.";
    return safeErrorResponse(400, message, "CREATION_FAILED");
  }
}
