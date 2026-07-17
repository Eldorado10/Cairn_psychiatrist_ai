"use client";

import { Phone, ShieldAlert } from "lucide-react";
import { useState } from "react";
import type { CrisisNotice } from "@/lib/safety/types";

type CallbackState = "idle" | "pending" | "confirmed" | "error";

const SUPPORT_LINES = [
  {
    name: "Bangladesh emergency services",
    number: "999",
    href: "tel:999",
    detail: "Police, fire, or ambulance when someone may be in immediate danger",
  },
  {
    name: "Kaan Pete Roi",
    number: "09612-119911",
    href: "tel:09612119911",
    detail: "Emotional support and suicide prevention helpline",
  },
  {
    name: "National Health Call Centre",
    number: "16263",
    href: "tel:16263",
    detail: "Health guidance in Bangladesh",
  },
  {
    name: "Women and children helpline",
    number: "109",
    href: "tel:109",
    detail: "Support related to violence against women and children",
  },
  {
    name: "Child Helpline",
    number: "1098",
    href: "tel:1098",
    detail: "Free, 24-hour support for children",
  },
] as const;

export function CrisisSupport({ notice }: { notice: CrisisNotice }) {
  const [callbackState, setCallbackState] = useState<CallbackState>("idle");

  async function requestCallback() {
    if (!notice.eventId || callbackState === "pending") {
      return;
    }

    setCallbackState("pending");

    try {
      const response = await fetch("/api/crisis/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: notice.eventId }),
      });

      if (!response.ok) {
        throw new Error("Callback request failed");
      }

      setCallbackState("confirmed");
    } catch {
      setCallbackState("error");
    }
  }

  return (
    <section
      role="alert"
      aria-labelledby="crisis-support-title"
      className="rounded-3xl border border-risk-high bg-surface p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-risk-high/15 text-risk-high">
          <ShieldAlert aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2
            id="crisis-support-title"
            className="font-display text-2xl leading-tight text-bone"
          >
            Please reach a person who can help now.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mute sm:text-base">
            Wren has paused its reply to this message. If you might act now, or
            someone is in immediate danger, call 999 or go to the nearest
            emergency department. If you can, move away from anything that
            could cause harm and stay with someone you trust.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {SUPPORT_LINES.map((line) => (
          <a
            key={line.number}
            href={line.href}
            className="flex min-h-16 items-center gap-3 rounded-2xl border border-veil bg-ink px-4 py-3 transition-colors hover:border-eucalyptus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus"
          >
            <Phone aria-hidden="true" className="size-4 shrink-0 text-eucalyptus" />
            <span>
              <span className="block text-sm font-medium text-bone">
                {line.name} · {line.number}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-mute">
                {line.detail}
              </span>
            </span>
          </a>
        ))}
      </div>

      <div className="mt-5 border-t border-veil pt-5">
        <button
          type="button"
          onClick={requestCallback}
          disabled={!notice.eventId || callbackState === "pending" || callbackState === "confirmed"}
          className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-eucalyptus px-5 font-medium text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus disabled:cursor-not-allowed disabled:opacity-50"
        >
          {callbackState === "pending"
            ? "Requesting callback…"
            : callbackState === "confirmed"
              ? "Urgent callback requested"
              : "Request an urgent callback"}
        </button>

        <p
          role={callbackState === "error" ? "alert" : "status"}
          className="mt-3 text-sm leading-6 text-mute"
        >
          {callbackState === "confirmed"
            ? "Your request has been recorded. If danger is immediate, call 999 rather than waiting."
            : callbackState === "error"
              ? "The callback request could not be recorded. Call 999 if danger is immediate, or try again."
              : !notice.eventId
                ? "The callback action is unavailable right now. Call 999 if danger is immediate."
                : "You can keep talking to Wren below while you contact support."}
        </p>
      </div>
    </section>
  );
}
