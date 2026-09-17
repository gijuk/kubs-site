"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "kubs_admin_session";

export async function loginAction(formData: FormData) {
  const password = formData.get("password");
  const correct = process.env.ADMIN_PASSWORD;

  if (!correct) {
    redirect("/admin/login?error=noconfig");
  }

  if (password !== correct) {
    redirect("/admin/login?error=wrong");
  }

  cookies().set(SESSION_COOKIE, "granted", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8시간
  });

  redirect("/admin");
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE);
  redirect("/admin/login");
}
