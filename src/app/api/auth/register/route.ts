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

    // Parse request body - now inside try-catch to handle invalid JSON
    const body = await req.json();
    const { name, email, password } = body;

    // Trim and normalize input
    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedPassword = password?.trim();

    // Validate required fields
    if (!trimmedEmail || !trimmedPassword) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate password length
    if (trimmedPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists (using normalized email)
    const existingUser = await db.user.findUnique({ where: { email: trimmedEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(trimmedPassword, 12);

    // Create user with normalized email
    const user = await db.user.create({
      data: {
        name: name?.trim() || null,
        email: trimmedEmail,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    // Handle invalid JSON
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

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

    // Check if it's a Prisma unique constraint error (using error code)
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Fallback for older Prisma versions or if code not available
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
