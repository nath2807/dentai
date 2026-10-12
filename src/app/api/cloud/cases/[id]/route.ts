import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../../lib/auth-service";
import {
  cloudRepository,
  ConcurrencyError,
  NotFoundError,
} from "../../../../../lib/cloud-repository";
import { safeErrorResponse } from "../../../../../lib/security";
import { handleDatabaseError } from "../../../../../lib/db-client";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return safeErrorResponse(401, "Authentication required.", "UNAUTHORIZED");
  }

  const { id } = await props.params;

  try {
    const cloudCase = await cloudRepository.getCase(session.userId, id);

    if (!cloudCase) {
      // Return 404 to avoid revealing case existence to other tenants
      return safeErrorResponse(404, `Case with ID ${id} not found.`, "NOT_FOUND");
    }

    return NextResponse.json({
      success: true,
      case: cloudCase,
    });
  } catch (err: unknown) {
    const dbErr = handleDatabaseError(err);
    if (dbErr) return dbErr;

    const message = err instanceof Error ? err.message : "Failed to retrieve case.";
    return safeErrorResponse(500, message, "INTERNAL_ERROR");
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return safeErrorResponse(401, "Authentication required.", "UNAUTHORIZED");
  }

  const { id } = await props.params;

  try {
    const body = await req.json();
    const expectedVersion =
      typeof body.version === "number" ? body.version : undefined;

    const updated = await cloudRepository.updateCase(
      session.userId,
      id,
      body,
      expectedVersion,
      session.email
    );

    return NextResponse.json({
      success: true,
      case: updated,
    });
  } catch (err: unknown) {
    const dbErr = handleDatabaseError(err);
    if (dbErr) return dbErr;

    if (err instanceof ConcurrencyError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONCURRENCY_CONFLICT",
            message: err.message,
            serverVersion: err.currentVersion,
            clientVersion: err.attemptedVersion,
          },
        },
        { status: 409 }
      );
    }

    if (err instanceof NotFoundError) {
      return safeErrorResponse(404, `Case ${id} not found.`, "NOT_FOUND");
    }

    const message = err instanceof Error ? err.message : "Failed to update case.";
    return safeErrorResponse(400, message, "UPDATE_FAILED");
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return safeErrorResponse(401, "Authentication required.", "UNAUTHORIZED");
  }

  const { id } = await props.params;

  try {
    await cloudRepository.deleteCase(session.userId, id, session.email);
    return NextResponse.json({
      success: true,
      message: `Case ${id} removed.`,
    });
  } catch (err: unknown) {
    const dbErr = handleDatabaseError(err);
    if (dbErr) return dbErr;

    if (err instanceof NotFoundError) {
      return safeErrorResponse(404, `Case ${id} not found.`, "NOT_FOUND");
    }
    const message = err instanceof Error ? err.message : "Failed to delete case.";
    return safeErrorResponse(400, message, "DELETE_FAILED");
  }
}
