import { NextResponse } from "next/server";
import { getDatabaseUrl } from "@/lib/db";

export async function GET() {
  const hasDatabase = !!getDatabaseUrl();
  return NextResponse.json({
    hasDatabase,
    mode: hasDatabase ? "remote" : "local",
  });
}
