import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      redirect("/chat");
    } else {
      redirect("/login");
    }
  } catch (error) {
    // If auth fails due to missing database, redirect to login anyway
    console.error("Session check failed:", error);
    redirect("/login");
  }
}
