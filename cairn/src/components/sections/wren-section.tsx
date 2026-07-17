"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap } from "@/lib/gsap";

const USER_MESSAGE =
  "I keep waking up around four and then I cannot get back to sleep. Before work there is this knot of dread in my chest, even on days when nothing is obviously wrong.";
const WREN_MESSAGE =
  "When that dread shows up before work, does it feel tied to something you expect will happen that day, or is it already there before you think about the day at all?";
const USER_REPLY =
  "It is there first. Then my mind starts finding reasons for it.";

function typedText(
  target: HTMLSpanElement | null,
  value: string,
  count: number,
) {
  if (target) target.textContent = value.slice(0, Math.round(count));
}

export function WrenSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const userTextRef = useRef<HTMLSpanElement>(null);
  const wrenTextRef = useRef<HTMLSpanElement>(null);
  const replyTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const conversation = conversationRef.current;
    if (!section || !conversation) return;

    const bubbles = gsap.utils.toArray<HTMLElement>(
      conversation.querySelectorAll("[data-message]"),
    );
    const match = conversation.querySelector<HTMLElement>("[data-specialty-match]");
    const cursor = { user: 0, wren: 0, reply: 0 };
    let timeline: gsap.core.Timeline | null = null;

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      typedText(userTextRef.current, USER_MESSAGE, 0);
      typedText(wrenTextRef.current, WREN_MESSAGE, 0);
      typedText(replyTextRef.current, USER_REPLY, 0);
      gsap.set([...bubbles, match], { autoAlpha: 0, y: 18 });

      timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top 72%",
          end: "bottom 70%",
          scrub: 0.55,
          invalidateOnRefresh: true,
        },
      });

      timeline
        .to(bubbles[0], { autoAlpha: 1, y: 0, duration: 0.12 })
        .to(cursor, {
          user: USER_MESSAGE.length,
          duration: 1.15,
          onUpdate: () => typedText(userTextRef.current, USER_MESSAGE, cursor.user),
        })
        .to(bubbles[1], { autoAlpha: 1, y: 0, duration: 0.12 })
        .to(cursor, {
          wren: WREN_MESSAGE.length,
          duration: 1.15,
          onUpdate: () => typedText(wrenTextRef.current, WREN_MESSAGE, cursor.wren),
        })
        .to(bubbles[2], { autoAlpha: 1, y: 0, duration: 0.12 })
        .to(cursor, {
          reply: USER_REPLY.length,
          duration: 0.72,
          onUpdate: () => typedText(replyTextRef.current, USER_REPLY, cursor.reply),
        })
        .to(match, { autoAlpha: 1, y: 0, duration: 0.45 });

      return () => {
        timeline?.scrollTrigger?.kill();
        timeline?.kill();
        timeline = null;
        typedText(userTextRef.current, USER_MESSAGE, USER_MESSAGE.length);
        typedText(wrenTextRef.current, WREN_MESSAGE, WREN_MESSAGE.length);
        typedText(replyTextRef.current, USER_REPLY, USER_REPLY.length);
      };
    });

    return () => {
      timeline?.scrollTrigger?.kill();
      timeline?.kill();
      media.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} id="wren" className="bg-surface px-6 py-28 md:py-40">
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-eucalyptus">
            Meet Wren
          </p>
          <h2 className="mt-6 max-w-md font-display text-display-md md:text-display-lg">
            A conversation that leaves room for the real answer.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-mute">
            Wren listens for what needs clarifying before it reaches for a
            suggestion.
          </p>
        </div>

        <div ref={conversationRef} className="space-y-5" aria-label="Example conversation with Wren">
          <div
            data-message
            className="ml-auto max-w-[90%] rounded-[1.5rem] rounded-br-md bg-veil px-5 py-4 text-bone motion-safe:opacity-0 sm:max-w-[78%]"
            aria-label={USER_MESSAGE}
          >
            <span ref={userTextRef} aria-hidden>
              {USER_MESSAGE}
            </span>
          </div>

          <div
            data-message
            className="max-w-[94%] rounded-[1.5rem] rounded-bl-md border border-veil bg-ink px-5 py-4 leading-7 text-bone motion-safe:opacity-0 sm:max-w-[84%]"
            aria-label={WREN_MESSAGE}
          >
            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-eucalyptus">
              Wren
            </span>
            <span ref={wrenTextRef} aria-hidden>
              {WREN_MESSAGE}
            </span>
          </div>

          <div
            data-message
            className="ml-auto max-w-[90%] rounded-[1.5rem] rounded-br-md bg-veil px-5 py-4 text-bone motion-safe:opacity-0 sm:max-w-[72%]"
            aria-label={USER_REPLY}
          >
            <span ref={replyTextRef} aria-hidden>
              {USER_REPLY}
            </span>
          </div>

          <div
            data-specialty-match
            className="mt-8 rounded-2xl border border-eucalyptus/40 bg-ink p-6 motion-safe:opacity-0"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <span className="text-xs uppercase tracking-[0.18em] text-eucalyptus">
                  Specialty match
                </span>
                <h3 className="mt-3 font-display text-3xl">Anxiety and sleep</h3>
                <p className="mt-3 max-w-lg leading-7 text-mute">
                  A clinician who works with anticipatory anxiety and disrupted
                  sleep may be a useful next conversation.
                </p>
              </div>
              <ArrowUpRight className="mt-1 size-5 shrink-0 text-eucalyptus" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
