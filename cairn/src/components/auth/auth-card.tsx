"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  signInAction,
  signInWithGoogle,
  signUpAction,
  type AuthActionState,
} from "@/app/auth/actions";

type Mode = "sign-in" | "sign-up";

const INITIAL_STATE: AuthActionState = { status: "idle" };

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-eucalyptus px-5 font-medium text-ink transition-colors hover:bg-eucalyptus/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone disabled:cursor-wait disabled:opacity-50"
    >
      {pending
        ? mode === "sign-in"
          ? "Signing in…"
          : "Creating account…"
        : mode === "sign-in"
          ? "Sign in"
          : "Create account"}
    </button>
  );
}

function GoogleButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-veil bg-ink px-5 font-medium text-bone transition-colors hover:bg-veil/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? "Opening Google…" : "Continue with Google"}
    </button>
  );
}

export function AuthCard({
  mode,
  nextPath,
  externalError,
}: {
  mode: Mode;
  nextPath: string;
  externalError?: string;
}) {
  const action = mode === "sign-in" ? signInAction : signUpAction;
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const message = state.message ?? externalError;
  const isError = state.status === "error" || Boolean(externalError);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-veil bg-surface p-7 sm:p-9">
        <Link
          href="/"
          className="font-display text-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-eucalyptus"
        >
          Cairn
        </Link>

        <h1 className="mt-10 font-display text-display-sm">
          {mode === "sign-in" ? "Welcome back." : "Make a little room."}
        </h1>
        <p className="mt-3 leading-7 text-mute">
          {mode === "sign-in"
            ? "Sign in to return to your conversations and care plan."
            : "Create an account to keep conversations private and continue when you are ready."}
        </p>

        {message ? (
          <div
            role={isError ? "alert" : "status"}
            aria-live="polite"
            className={`mt-6 rounded-xl border px-4 py-3 text-sm leading-6 ${
              isError
                ? "border-risk-high/50 bg-risk-high/10 text-bone"
                : "border-eucalyptus/50 bg-eucalyptus/10 text-bone"
            }`}
          >
            {message}
          </div>
        ) : null}

        <form action={formAction} className="mt-7 space-y-5">
          <input type="hidden" name="next" value={nextPath} />

          {mode === "sign-up" ? (
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm text-bone">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                className="h-12 w-full rounded-xl border border-veil bg-ink px-4 text-bone outline-none transition-colors placeholder:text-mute focus:border-eucalyptus focus:ring-2 focus:ring-eucalyptus/25"
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-bone">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              className="h-12 w-full rounded-xl border border-veil bg-ink px-4 text-bone outline-none transition-colors placeholder:text-mute focus:border-eucalyptus focus:ring-2 focus:ring-eucalyptus/25"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-bone">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              required
              minLength={mode === "sign-up" ? 8 : undefined}
              className="h-12 w-full rounded-xl border border-veil bg-ink px-4 text-bone outline-none transition-colors placeholder:text-mute focus:border-eucalyptus focus:ring-2 focus:ring-eucalyptus/25"
            />
            {mode === "sign-up" ? (
              <p className="mt-2 text-sm leading-6 text-mute">
                Use at least eight characters.
              </p>
            ) : null}
          </div>

          {mode === "sign-up" ? (
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm text-bone"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="h-12 w-full rounded-xl border border-veil bg-ink px-4 text-bone outline-none transition-colors placeholder:text-mute focus:border-eucalyptus focus:ring-2 focus:ring-eucalyptus/25"
              />
            </div>
          ) : null}

          <SubmitButton mode={mode} />
        </form>

        <div className="my-6 flex items-center gap-4" aria-hidden>
          <span className="h-px flex-1 bg-veil" />
          <span className="text-xs uppercase tracking-[0.18em] text-mute">or</span>
          <span className="h-px flex-1 bg-veil" />
        </div>

        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={nextPath} />
          <GoogleButton />
        </form>

        <p className="mt-7 text-center text-sm text-mute">
          {mode === "sign-in" ? "New to Cairn?" : "Already have an account?"}{" "}
          <Link
            href={
              mode === "sign-in"
                ? `/auth/sign-up?next=${encodeURIComponent(nextPath)}`
                : `/auth/sign-in?next=${encodeURIComponent(nextPath)}`
            }
            className="font-medium text-bone underline decoration-veil underline-offset-4 hover:decoration-eucalyptus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus"
          >
            {mode === "sign-in" ? "Create one" : "Sign in"}
          </Link>
        </p>
      </div>
    </main>
  );
}
