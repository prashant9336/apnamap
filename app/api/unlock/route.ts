import { NextRequest, NextResponse } from "next/server";
import { checkRate } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    const blocked = await checkRate(req, "unlock");
    if (blocked) return blocked;

    const { password } = await req.json();

    if (!process.env.SITE_PASSWORD) {
      return NextResponse.json(
        { message: "SITE_PASSWORD is not set on server" },
        { status: 500 }
      );
    }

    if (password !== process.env.SITE_PASSWORD) {
      return NextResponse.json(
        { message: "Invalid password" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ success: true });

    res.cookies.set("apnamap_access", "granted", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch {
    return NextResponse.json(
      { message: "Bad request" },
      { status: 400 }
    );
  }
}