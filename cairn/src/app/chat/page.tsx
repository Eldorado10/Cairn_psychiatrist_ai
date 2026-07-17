"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowLeft, SendHorizontal, Square } from "lucide-react";
import Link from "next/link";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CrisisSupport } from "@/components/chat/crisis-support";
import type { MatchedDoctor } from "@/lib/matching/doctors";
import type { CairnUIMessage, CrisisNotice } from "@/lib/safety/types";
import type { Database } from "@/lib/supabase/types";

const RATE_LIMIT_MESSAGE =
  "Wren is over its request limit for today. Your conversation is saved.";

// A conversation ends when the person clicks Finish or after 20 idle minutes.
const IDLE_FINISH_MS = 20 * 60 * 1000;

type AssessmentRow = Database["public"]["Tables"]["assessments"]["Row"];

type FinishState =
  | { phase: "idle" }
  | { phase: "finishing" }
  | {
      phase: "done";
      assessment: AssessmentRow | null;
      doctors: MatchedDoctor[];
    };

function isRateLimitError(error: Error | undefined) {
  return error?.message.includes("RATE_LIMIT") ?? false;
}

function isCrisisNotice(value: unknown): value is CrisisNotice {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "eventId" in value &&
    (typeof value.eventId === "string" || value.eventId === null) &&
    "triggerSource" in value &&
    (value.triggerSource === "keyword" || value.triggerSource === "model")
  );
}

export default function ChatPage() {
  const [conversationId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState("");
  const [crisisNotice, setCrisisNotice] = useState<CrisisNotice | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport<CairnUIMessage>({ api: "/api/chat" }),
    [],
  );
  const {
    messages,
    sendMessage,
    status,
    error,
    clearError,
    stop,
  } = useChat<CairnUIMessage>({
    id: conversationId,
    transport,
    onData(dataPart) {
      if (dataPart.type === "data-crisis" && isCrisisNotice(dataPart.data)) {
        setCrisisNotice(dataPart.data);
      }
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  const [finishState, setFinishState] = useState<FinishState>({ phase: "idle" });
  const [finishFailed, setFinishFailed] = useState(false);
  const finishRequested = useRef(false);
  const ended = finishState.phase === "done";

  const finishConversation = useCallback(async () => {
    if (finishRequested.current || isBusy || messages.length === 0) {
      return;
    }
    finishRequested.current = true;
    setFinishFailed(false);
    setFinishState({ phase: "finishing" });

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/finish`,
        { method: "POST" },
      );
      if (!response.ok) {
        throw new Error(`Finish failed with status ${response.status}`);
      }
      const body = (await response.json()) as {
        assessment: AssessmentRow | null;
        doctors: MatchedDoctor[];
      };
      setFinishState({
        phase: "done",
        assessment: body.assessment ?? null,
        doctors: body.doctors ?? [],
      });
    } catch (finishError) {
      console.error("Could not finish the conversation", finishError);
      finishRequested.current = false;
      setFinishFailed(true);
      setFinishState({ phase: "idle" });
    }
  }, [conversationId, isBusy, messages.length]);

  // Idle finish: any activity (new tokens, typing, status changes) re-arms
  // the 20-minute timer.
  useEffect(() => {
    if (finishState.phase !== "idle" || messages.length === 0 || isBusy) {
      return;
    }
    const timer = setTimeout(() => {
      void finishConversation();
    }, IDLE_FINISH_MS);
    return () => clearTimeout(timer);
  }, [finishState.phase, messages, isBusy, input, finishConversation]);

  const sessionExpired = error?.message.includes("UNAUTHENTICATED") ?? false;
  const errorMessage = error
    ? isRateLimitError(error)
      ? RATE_LIMIT_MESSAGE
      : sessionExpired
        ? "Your session has ended. Sign in again to continue this saved conversation."
      : "Wren could not respond just now. Your message is saved. Check your connection and try again."
    : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [messages, status, error]);

  async function submitMessage() {
    const text = input.trim();

    if (!text || isBusy) {
      return;
    }

    clearError();
    setInput("");
    await sendMessage({ text });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-ink text-bone">
      <header className="shrink-0 border-b border-veil bg-ink/95 px-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-mute transition-colors hover:text-bone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Cairn
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-eucalyptus"
              />
              Wren
            </div>
            {!ended ? (
              <button
                type="button"
                onClick={() => void finishConversation()}
                disabled={
                  isBusy ||
                  messages.length === 0 ||
                  finishState.phase !== "idle"
                }
                className="rounded-full border border-veil px-4 py-1.5 text-sm text-bone transition-colors hover:bg-veil/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus disabled:cursor-not-allowed disabled:opacity-40"
              >
                {finishState.phase === "finishing" ? "Saving…" : "Finish"}
              </button>
            ) : null}
          </div>
        </div>
        <p className="mx-auto max-w-4xl border-t border-veil py-3 text-center text-xs leading-5 text-mute sm:text-sm">
          Wren is an AI guide, not a clinician. It cannot diagnose, prescribe, or
          replace emergency care.
        </p>
      </header>

      <section
        aria-label="Conversation with Wren"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-8 sm:px-6"
      >
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-4">
          {messages.length === 0 ? (
            <div className="my-auto py-16 text-center">
              <p className="font-display text-4xl text-bone sm:text-5xl">
                Start wherever feels easiest.
              </p>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-mute">
                Wren will listen, reflect back what it hears, and help you think
                about what kind of support may fit.
              </p>
            </div>
          ) : null}

          {messages.map((message) => {
            const text = message.parts
              .filter(
                (part): part is Extract<
                  (typeof message.parts)[number],
                  { type: "text" }
                > => part.type === "text",
              )
              .map((part) => part.text)
              .join("");

            if (!text) {
              return null;
            }

            const isUser = message.role === "user";

            return (
              <article
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-3xl border border-veil px-5 py-3.5 text-[0.95rem] leading-7 whitespace-pre-wrap sm:max-w-[75%] ${
                    isUser
                      ? "rounded-br-md bg-veil text-bone"
                      : "rounded-bl-md bg-surface text-bone"
                  }`}
                >
                  {text}
                </div>
              </article>
            );
          })}

          {crisisNotice ? (
            <CrisisSupport
              key={crisisNotice.eventId ?? crisisNotice.triggerSource}
              notice={crisisNotice}
            />
          ) : null}

          {status === "submitted" ? (
            <div
              role="status"
              aria-label="Wren is thinking"
              className="flex min-h-12 items-center"
            >
              <span className="motion-safe:animate-pulse size-2.5 rounded-full bg-eucalyptus" />
            </div>
          ) : null}

          {finishState.phase === "done" ? (
            <section
              aria-label="Conversation reflection"
              className="mt-4 rounded-2xl border border-eucalyptus/40 bg-surface p-6"
            >
              <span className="text-xs uppercase tracking-[0.18em] text-eucalyptus">
                Conversation saved
              </span>
              {finishState.assessment ? (
                <>
                  {finishState.assessment.ai_summary ? (
                    <p className="mt-3 leading-7 text-bone">
                      {finishState.assessment.ai_summary}
                    </p>
                  ) : null}
                  {finishState.assessment.ai_suggestion ? (
                    <p className="mt-2 leading-7 text-mute">
                      {finishState.assessment.ai_suggestion}
                    </p>
                  ) : (
                    <p className="mt-2 leading-7 text-mute">
                      A member of the care team will look over this
                      conversation.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 leading-7 text-mute">
                  This conversation ended before anything was shared.
                </p>
              )}

              {finishState.doctors.length > 0 ? (
                <div className="mt-5 border-t border-veil pt-5">
                  <p className="text-sm text-mute">
                    People whose work fits what you described:
                  </p>
                  <ul className="mt-3 space-y-3">
                    {finishState.doctors.map((doctor) => (
                      <li key={doctor.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-medium text-bone">
                          {doctor.full_name.replace("[DEMO] ", "")}
                        </span>
                        {doctor.title ? (
                          <span className="text-sm text-mute">{doctor.title}</span>
                        ) : null}
                        <span className="text-sm capitalize text-eucalyptus">
                          {doctor.specialties.join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-2xl border border-veil bg-surface px-4 py-3 text-sm leading-6 text-mute"
            >
              {errorMessage}
              {sessionExpired ? (
                <Link
                  href="/auth/sign-in?next=%2Fchat"
                  className="ml-2 font-medium text-bone underline decoration-veil underline-offset-4 hover:decoration-eucalyptus"
                >
                  Sign in
                </Link>
              ) : null}
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </section>

      <footer className="shrink-0 border-t border-veil bg-ink px-4 py-4 sm:px-6">
        {finishFailed ? (
          <p
            role="alert"
            className="mx-auto mb-3 max-w-3xl rounded-2xl border border-veil bg-surface px-4 py-3 text-sm leading-6 text-mute"
          >
            The conversation could not be saved just now. Nothing is lost —
            try Finish again in a moment.
          </p>
        ) : null}
        {ended ? (
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <p className="text-sm text-mute">
              This conversation has ended and is saved to your account.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 rounded-full bg-eucalyptus px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-eucalyptus/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone"
            >
              Start a new conversation
            </button>
          </div>
        ) : (
        <>
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-veil bg-surface p-2 focus-within:border-eucalyptus"
        >
          <label htmlFor="chat-message" className="sr-only">
            Message Wren
          </label>
          <textarea
            id="chat-message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={4_000}
            rows={1}
            placeholder="Tell Wren what has been on your mind"
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.95rem] leading-6 text-bone outline-none placeholder:text-mute"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={() => stop()}
              aria-label="Stop Wren's response"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-veil text-bone transition-colors hover:bg-eucalyptus hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus"
            >
              <Square aria-hidden="true" className="size-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send message"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-eucalyptus text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus disabled:cursor-not-allowed disabled:opacity-35"
            >
              <SendHorizontal aria-hidden="true" className="size-4" />
            </button>
          )}
        </form>
        <p className="mx-auto mt-2 max-w-3xl px-2 text-xs text-mute">
          Enter to send · Shift + Enter for a new line
        </p>
        </>
        )}
      </footer>
    </main>
  );
}
