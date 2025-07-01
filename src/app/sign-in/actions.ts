"use server";
import { redirect } from "next/navigation";
import { getUserByEmail, verifySecret } from "@/lib/actions/user.actions";

export async function signInHandler(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user) throw new Error("User not found");
  // verifySecret will set the session cookie if successful
  const session = await verifySecret({ accountId: user.accountId, password });
  if (!session) throw new Error("Invalid credentials");
  // Redirect based on user role
  switch (user.role) {
    case "executive":
      redirect("/dashboard/executive");
    case "manager":
      redirect("/dashboard/manager");
    case "hr":
      redirect("/dashboard/hr");
    default:
      redirect("/");
  }
}
