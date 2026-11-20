"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { createSession, destroySession } from "@/lib/auth";
import {
  getAdminPasswordHash,
  logAdminPasswordHashStatus,
} from "@/lib/env";
import { loginSchema } from "@/lib/validators";

export type LoginState = {
  error?: string;
};

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  logAdminPasswordHashStatus();

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Invalid email or password" };
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim() ?? "";
  const passwordHash = getAdminPasswordHash();

  const emailMatches =
    adminEmail.length > 0 &&
    parsed.data.email.toLowerCase() === adminEmail.toLowerCase();

  const passwordMatches =
    passwordHash.length > 0 &&
    (await bcrypt.compare(parsed.data.password, passwordHash));

  if (!emailMatches || !passwordMatches) {
    return { error: "Invalid email or password" };
  }

  await createSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
