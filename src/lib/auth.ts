import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionToken } from "./session";

export async function isAdmin() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return !!value && value === (await sessionToken());
}

/** Las server actions se pueden invocar desde cualquier ruta: cada acción de admin debe llamar a esto. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
