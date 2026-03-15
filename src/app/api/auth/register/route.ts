import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database is not configured. Please contact the administrator." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcryptjs.hash(password, 12);

    const user = await db.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    // Check if it's a database connection error
    if (error instanceof Error &&
        (error.message.includes("Can't reach database") ||
         error.message.includes("connection") ||
         error.message.includes("ECONNREFUSED"))) {
      return NextResponse.json(
        { error: "Unable to connect to the database. Please try again later or contact support." },
        { status: 503 }
      );
    }

    // Check if it's a Prisma validation error
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
