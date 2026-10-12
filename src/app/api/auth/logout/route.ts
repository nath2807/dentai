import { NextResponse } from "next/server";
import { buildLogoutCookie } from "../../../../lib/auth-service";

export async function POST() {
  const cookieHeader = buildLogoutCookie();
  return NextResponse.json(
    {
      success: true,
      message: "Logged out successfully.",
    },
    {
      status: 200,
      headers: {
        "Set-Cookie": cookieHeader,
      },
    }
  );
}
