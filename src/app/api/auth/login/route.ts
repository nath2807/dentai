import { NextResponse } from "next/server";
import { loginRequestSchema } from "../../../../lib/auth-types";
import { authenticateUser, buildSessionCookie } from "../../../../lib/auth-service";
import { evaluateRateLimit, getAnonymizedClientIdentifier, safeErrorResponse } from "../../../../lib/security";
import { handleDatabaseError } from "../../../../lib/db-client";

export async function POST(req: Request) {
  try {
    const clientId = getAnonymizedClientIdentifier(req);
    const rateCheck = await evaluateRateLimit(`login:${clientId}`, 10, 900); // 10 attempts per 15 mins
    if (!rateCheck.allowed) {
      if (rateCheck.code === "RATE_LIMITER_UNCONFIGURED" || rateCheck.code === "RATE_LIMITER_UNAVAILABLE") {
        return safeErrorResponse(
          503,
          "Authentication service is temporarily unavailable. Distributed rate limiter configuration required.",
          rateCheck.code
        );
      }
      return safeErrorResponse(
        429,
        `Too many login attempts. Please try again in ${rateCheck.resetInSeconds} seconds.`,
        "RATE_LIMITED"
      );
    }

    const body = await req.json();
    const parseResult = loginRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return safeErrorResponse(400, "Please provide a valid email and password.", "VALIDATION_ERROR");
    }

    const { user, token } = await authenticateUser(parseResult.data);
    const cookieHeader = buildSessionCookie(token);

    return NextResponse.json(
      {
        success: true,
        user,
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": cookieHeader,
        },
      }
    );
  } catch (err: unknown) {
    const dbErr = handleDatabaseError(err);
    if (dbErr) return dbErr;

    // Return generic error message to prevent user enumeration attacks
    return safeErrorResponse(401, "Invalid email or password.", "AUTHENTICATION_FAILED");
  }
}
