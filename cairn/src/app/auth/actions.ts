"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
  });

function safeNext(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

function messageForAuthError(error: AuthError, mode: "sign-in" | "sign-up") {
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password do not match. Check both fields, or create an account if you have not yet.";
    case "email_not_confirmed":
      return "Your email still needs confirming. Open the link from Cairn, then try signing in again.";
    case "user_already_exists":
    case "email_exists":
      return "An account already uses this email. Sign in instead, or use another address.";
    case "weak_password":
      return "That password needs more strength. Use at least eight characters and avoid common phrases.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "There have been too many attempts in a short time. Wait a few minutes, then try again.";
    default:
      return mode === "sign-in"
        ? "Cairn could not complete the sign-in. Check your connection and details, then try again."
        : "Cairn could not create the account. Check your connection and details, then try again.";
  }
}

async function requestOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) return "http://localhost:3000";
  return `${protocol}://${host}`;
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a valid email address and your password, then try again.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { status: "error", message: messageForAuthError(error, "sign-in") };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const passwordMismatch = parsed.error.issues.some(
      (issue) => issue.path[0] === "confirmPassword",
    );
    return {
      status: "error",
      message: passwordMismatch
        ? "The two passwords do not match. Enter the same password in both fields."
        : "Use your name, a valid email address, and a password of at least eight characters.",
    };
  }

  const next = safeNext(formData.get("next"));
  const origin = await requestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    return { status: "error", message: messageForAuthError(error, "sign-up") };
  }

  if (data.user?.identities?.length === 0) {
    return {
      status: "error",
      message: "An account may already use this email. Try signing in, or use another address.",
    };
  }

  if (data.session) redirect(next);

  return {
    status: "success",
    message: "Check your inbox. Open the confirmation link, then sign in with your new password.",
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const origin = await requestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/auth/sign-in?error=oauth_start&next=${encodeURIComponent(next)}`);
  }

  redirect(data.url);
}
