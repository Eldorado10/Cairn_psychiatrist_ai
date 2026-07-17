"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Show the Sign in link only to visitors without a session; keep it in sync
// if they sign in/out in another tab.
function useSignedIn(initialSignedIn: boolean) {
  const [signedIn, setSignedIn] = useState(initialSignedIn);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => subscription.unsubscribe();
  }, []);

  return signedIn;
}

const LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Wren", href: "#wren" },
  { label: "Clinicians", href: "#clinicians" },
  { label: "About", href: "#cta" },
] as const;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function NavLink({
  href,
  children,
  className,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const lineRef = useRef<HTMLSpanElement>(null);

  const wipe = (to: 0 | 1) => {
    const line = lineRef.current;
    if (!line || prefersReducedMotion()) return;
    gsap.killTweensOf(line);
    // Grows in from the left, exits out to the right.
    gsap.set(line, { transformOrigin: to === 1 ? "left center" : "right center" });
    gsap.to(line, {
      scaleX: to,
      duration: to === 1 ? 0.35 : 0.28,
      ease: to === 1 ? "power3.out" : "power2.in",
    });
  };

  return (
    <a
      href={href}
      onClick={onClick}
      onMouseEnter={() => wipe(1)}
      onMouseLeave={() => wipe(0)}
      onFocus={() => wipe(1)}
      onBlur={() => wipe(0)}
      className={cn(
        "relative py-1 text-sm text-mute transition-colors hover:text-bone focus-visible:text-bone",
        className,
      )}
    >
      {children}
      <span
        ref={lineRef}
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px scale-x-0 bg-eucalyptus"
      />
    </a>
  );
}

function MobileMenu({
  open,
  onClose,
  signedIn,
}: {
  open: boolean;
  onClose: () => void;
  signedIn: boolean;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus trap + Escape + scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        overlay.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      );
    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !overlay.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !overlay.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  // Staggered link reveal.
  useEffect(() => {
    if (!open || prefersReducedMotion()) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const items = overlay.querySelectorAll("[data-menu-item]");
    gsap.fromTo(
      items,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.07, ease: "power3.out" },
    );
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      data-lenis-prevent
      className="fixed inset-0 z-[60] flex flex-col bg-ink md:hidden"
    >
      <div className="flex h-16 items-center justify-between px-6">
        <span className="font-display text-2xl">Cairn</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="rounded-full p-2 text-bone hover:bg-veil focus-visible:outline-2 focus-visible:outline-eucalyptus"
        >
          <X className="size-6" aria-hidden />
        </button>
      </div>
      <nav className="flex flex-1 flex-col items-start justify-center gap-8 px-8">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            data-menu-item
            onClick={onClose}
            className="font-display text-display-sm text-bone focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-eucalyptus"
          >
            {link.label}
          </a>
        ))}
        {signedIn ? (
          <>
            <a
              href="/dashboard"
              data-menu-item
              onClick={onClose}
              className="mt-2 text-lg text-mute focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-eucalyptus"
            >
              Dashboard
            </a>
            <form action={signOutAction} data-menu-item>
              <button
                type="submit"
                className="text-lg text-mute focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-eucalyptus"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <a
            href="/auth/sign-in"
            data-menu-item
            onClick={onClose}
            className="mt-2 text-lg text-mute focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-eucalyptus"
          >
            Sign in
          </a>
        )}
        <a
          href="/chat"
          data-menu-item
          onClick={onClose}
          className="mt-2 rounded-full bg-eucalyptus px-6 py-3 text-lg font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
        >
          Talk to Wren
        </a>
      </nav>
    </div>
  );
}

export function Navbar({ initialSignedIn = false }: { initialSignedIn?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = useSignedIn(initialSignedIn);

  // Bar state is driven by ScrollTrigger (start: 80px), not a scroll listener.
  useEffect(() => {
    const st = ScrollTrigger.create({
      start: 80,
      end: "max",
      onToggle: (self) => setScrolled(self.isActive),
    });
    return () => st.kill();
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "border-veil bg-ink/70 backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      {/* 3-column grid keeps the links truly centered without transforms
          (translate-x centering breaks under the reduced-motion override). */}
      <nav className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6">
        <a
          href="#hero"
          className="justify-self-start font-display text-2xl tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-eucalyptus"
        >
          Cairn
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-5 justify-self-end">
          {signedIn ? (
            <>
              <a
                href="/dashboard"
                className="hidden text-sm text-mute transition-colors hover:text-bone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus md:inline-block"
              >
                Dashboard
              </a>
              <form action={signOutAction} className="hidden md:block">
                <button
                  type="submit"
                  className="text-sm text-mute transition-colors hover:text-bone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <a
              href="/auth/sign-in"
              className="hidden text-sm text-mute transition-colors hover:text-bone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus md:inline-block"
            >
              Sign in
            </a>
          )}
          <a
            href="/chat"
            className="hidden rounded-full bg-eucalyptus px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-eucalyptus/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone md:inline-block"
          >
            Talk to Wren
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="rounded-full p-2 text-bone hover:bg-veil focus-visible:outline-2 focus-visible:outline-eucalyptus md:hidden"
          >
            <Menu className="size-6" aria-hidden />
          </button>
        </div>
      </nav>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        signedIn={signedIn}
      />
    </header>
  );
}
