import { NextResponse } from "next/server";
import { getSessionFromRequest, userStore } from "../../../../lib/auth-service";
import { handleDatabaseError } from "../../../../lib/db-client";

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
        },
        { status: 200 }
      );
    }
    const user = await userStore.findById(session.userId);
    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        licenseNumber: user.licenseNumber,
        organization: user.organization,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      session: {
        userId: session.userId,
        role: session.role,
        expiresAt: session.expiresAt,
      },
    });
  } catch (err: unknown) {
    const dbErr = handleDatabaseError(err);
    if (dbErr) return dbErr;

    return NextResponse.json(
      {
        authenticated: false,
        user: null,
      },
      { status: 500 }
    );
  }
}
