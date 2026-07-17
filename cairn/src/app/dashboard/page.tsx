import { CalendarDays, ClipboardList, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  return dateFormatter.format(new Date(value));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (!claims) {
    redirect("/auth/sign-in?next=%2Fdashboard");
  }

  const userId = claims.sub;

  const [
    { data: profile },
    { data: conversations },
    { data: assessments },
    { data: appointments },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("conversations")
      .select("id, started_at, status")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(3),
    supabase
      .from("assessments")
      .select("id, created_at, risk, primary_concern, ai_summary")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("appointments")
      .select("id, created_at, status, patient_note")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const displayName = profile?.full_name ?? claims.email ?? "Your account";
  const recentAssessments = assessments ?? [];
  const recentConversations = conversations ?? [];
  const recentAppointments = appointments ?? [];

  return (
    <main className="min-h-dvh bg-ink px-4 py-6 text-bone sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-veil pb-5">
          <Link
            href="/"
            className="font-display text-3xl tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-eucalyptus"
          >
            Cairn
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="rounded-full bg-eucalyptus px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-eucalyptus/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone"
            >
              Talk to Wren
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-full border border-veil px-5 py-2.5 text-sm text-bone transition-colors hover:bg-veil/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-eucalyptus">
              Private dashboard
            </p>
            <h1 className="mt-3 font-display text-5xl leading-tight text-bone sm:text-6xl">
              Welcome, {displayName}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-mute">
              This page is only available to registered users. Your care notes
              and saved conversations are loaded from your account.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border border-veil bg-surface p-4">
              <div className="flex items-center gap-2 text-sm text-mute">
                <MessageCircle className="size-4 text-eucalyptus" aria-hidden />
                Conversations
              </div>
              <p className="mt-3 text-3xl font-medium">{recentConversations.length}</p>
            </div>
            <div className="rounded-lg border border-veil bg-surface p-4">
              <div className="flex items-center gap-2 text-sm text-mute">
                <ClipboardList className="size-4 text-eucalyptus" aria-hidden />
                Assessments
              </div>
              <p className="mt-3 text-3xl font-medium">{recentAssessments.length}</p>
            </div>
            <div className="rounded-lg border border-veil bg-surface p-4">
              <div className="flex items-center gap-2 text-sm text-mute">
                <CalendarDays className="size-4 text-eucalyptus" aria-hidden />
                Appointments
              </div>
              <p className="mt-3 text-3xl font-medium">{recentAppointments.length}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-veil bg-surface p-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5 text-eucalyptus" aria-hidden />
              <h2 className="text-lg font-medium">Recent assessments</h2>
            </div>
            <div className="mt-5 space-y-4">
              {recentAssessments.length > 0 ? (
                recentAssessments.map((assessment) => (
                  <article key={assessment.id} className="border-t border-veil pt-4">
                    <p className="text-sm capitalize text-eucalyptus">
                      {assessment.risk} risk
                    </p>
                    <p className="mt-2 text-sm leading-6 text-bone">
                      {assessment.primary_concern ?? "No primary concern recorded"}
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      {formatDate(assessment.created_at)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="border-t border-veil pt-4 text-sm leading-6 text-mute">
                  No assessments yet. Finish a Wren conversation to save one.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-veil bg-surface p-5">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-5 text-eucalyptus" aria-hidden />
              <h2 className="text-lg font-medium">Saved conversations</h2>
            </div>
            <div className="mt-5 space-y-4">
              {recentConversations.length > 0 ? (
                recentConversations.map((conversation) => (
                  <article key={conversation.id} className="border-t border-veil pt-4">
                    <p className="text-sm capitalize text-bone">
                      {conversation.status ?? "active"}
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      Started {formatDate(conversation.started_at)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="border-t border-veil pt-4 text-sm leading-6 text-mute">
                  No saved conversations yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-veil bg-surface p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-eucalyptus" aria-hidden />
              <h2 className="text-lg font-medium">Account access</h2>
            </div>
            <div className="mt-5 border-t border-veil pt-4">
              <p className="text-sm leading-6 text-mute">
                Registered since {formatDate(profile?.created_at ?? null)}.
              </p>
              <p className="mt-3 text-sm leading-6 text-mute">
                Your dashboard data is filtered to your user id by Supabase RLS.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
