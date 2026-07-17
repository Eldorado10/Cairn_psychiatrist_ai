import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Sign in · Cairn",
  description: "Sign in to Cairn.",
};

const CALLBACK_ERRORS: Record<string, string> = {
  oauth_start:
    "Google sign-in could not start. Check that Google is enabled for this project, then try again.",
  oauth_callback:
    "The sign-in link could not be completed. Start again, and use the newest link or Google window.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthCard
      mode="sign-in"
      nextPath={params.next ?? "/"}
      externalError={params.error ? CALLBACK_ERRORS[params.error] : undefined}
    />
  );
}
