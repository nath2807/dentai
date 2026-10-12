import { NextResponse } from "next/server";
import { registerRequestSchema } from "../../../../lib/auth-types";
import {
  userStore,
  signSessionToken,
  buildSessionCookie,
  SESSION_DURATION_SECONDS,
} from "../../../../lib/auth-service";
import { evaluateRateLimit, getAnonymizedClientIdentifier, safeErrorResponse } from "../../../../lib/security";
import { handleDatabaseError } from "../../../../lib/db-client";

export async function POST(req: Request) {
  try {
    const clientId = getAnonymizedClientIdentifier(req);
    const rateCheck = await evaluateRateLimit(`register:${clientId}`, 6, 900); // 6 attempts per 15 mins
    if (!rateCheck.allowed) {
      if (rateCheck.code === "RATE_LIMITER_UNCONFIGURED" || rateCheck.code === "RATE_LIMITER_UNAVAILABLE") {
        return safeErrorResponse(
          503,
          "Registration service is temporarily unavailable. Distributed rate limiter configuration required.",
          rateCheck.code
        );
      }
      return safeErrorResponse(
        429,
        `Too many registration attempts. Please wait ${rateCheck.resetInSeconds} seconds.`,
        "RATE_LIMITED"
      );
    }

    const body = await req.json();
    const parseResult = registerRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid registration request.";
      return safeErrorResponse(400, errorMsg, "VALIDATION_ERROR");
    }

    const user = await userStore.create(parseResult.data);

    // Issue session token
    const now = Math.floor(Date.now() / 1000);
    const sessionToken = signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      issuedAt: now,
      expiresAt: now + SESSION_DURATION_SECONDS,
    });

    const cookieHeader = buildSessionCookie(sessionToken);

    return NextResponse.json(
      {
        success: true,
        user,
      },
      {
        status: 201,
        headers: {
          "Set-Cookie": cookieHeader,
        },
      }
    );
  } catch (err: unknown) {
    const dbErr = handleDatabaseError(err);
    if (dbErr) return dbErr;

    if (err instanceof Error && err.message.toLowerCase().includes("already exists")) {
      return safeErrorResponse(
        400,
        "Registration could not be completed with the provided information. If you already have an account, please sign in.",
        "REGISTRATION_FAILED"
      );
    }
    const message = err instanceof Error ? err.message : "Failed to register account.";
    return safeErrorResponse(400, message, "REGISTRATION_FAILED");
  }
}
