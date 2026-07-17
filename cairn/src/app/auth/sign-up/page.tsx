import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Create an account · Cairn",
  description: "Create your Cairn account.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return <AuthCard mode="sign-up" nextPath={params.next ?? "/"} />;
}
