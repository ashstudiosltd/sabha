"use client";

import {
  Check,
  Copy,
  Link as LinkIcon,
  Monitor,
  X,
} from "lucide-react";
import {
  FaLinkedinIn,
  FaTelegram,
  FaWhatsapp,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  copyShareLink,
  getLinkedInShareUrl,
  getTelegramShareUrl,
  getWhatsAppShareUrl,
  getXShareUrl,
  shareWithDevice,
  type DevvratsShareData,
} from "@/lib/share/share";

/*
  THEMING HOOK
  The left ruler reads the same CSS variable as the blog modal, so one
  ancestor setting restyles both:

    --blog-accent     left ruler color       (default #4a8fe7)
*/

/*
  SCROLL EFFECT
  Same technique as the blog modal: the header sits above a separate
  scrolling body, and the body's edges fade in/out with scroll position.

    --ft    0 → 1  top fade strength
    --fb    0 → 1  bottom fade strength
*/

const FADE_PX = 28;
const FADE_RANGE = 24;

const MASK = `linear-gradient(to bottom, transparent 0, #000 calc(var(--ft, 0) * ${FADE_PX}px), #000 calc(100% - var(--fb, 0) * ${FADE_PX}px), transparent 100%)`;

const CLOSE_MS = 220;

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  shareData: DevvratsShareData;
}

export default function ShareSheet({
  open,
  onClose,
  shareData,
}: ShareSheetProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const [nativeShareSupported, setNativeShareSupported] =
    useState(false);

  /* ---------------- REFS ---------------- */

  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const closeTimer = useRef<number | null>(null);
  const copyTimer = useRef<number | null>(null);

  /* ---------------- SCROLL EFFECT ---------------- */

  const updateScrollFx = useCallback(() => {
    const panel = panelRef.current;
    const body = bodyRef.current;

    if (!panel || !body) return;

    const top = body.scrollTop;
    const max = body.scrollHeight - body.clientHeight;

    const clamp = (value: number) =>
      Math.min(1, Math.max(0, value));

    panel.style.setProperty(
      "--ft",
      clamp(top / FADE_RANGE).toFixed(3)
    );

    panel.style.setProperty(
      "--fb",
      clamp((max - top) / FADE_RANGE).toFixed(3)
    );
  }, []);

  /* ---------------- NATIVE SHARE SUPPORT ---------------- */

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setNativeShareSupported(
        typeof navigator.share === "function"
      );
    }
  }, []);

  /* ---------------- OPEN / RESET ---------------- */

  useEffect(() => {
    if (!open) {
      setVisible(false);
      setCopied(false);
      return;
    }

    const raf = requestAnimationFrame(() =>
      setVisible(true)
    );

    return () => cancelAnimationFrame(raf);
  }, [open]);

  /* ---------------- CLEAN UP TIMERS ---------------- */

  useEffect(() => {
    return () => {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
      }

      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current);
      }
    };
  }, []);

  /* ---------------- CLOSE (animated) ---------------- */

  const handleClose = useCallback(() => {
    if (closeTimer.current) return;

    setVisible(false);

    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      onClose();
    }, CLOSE_MS);
  }, [onClose]);

  /* ---------------- ESC KEY + BODY SCROLL ---------------- */

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      // Keeps a parent modal's own Escape handler from also firing.
      event.stopPropagation();

      handleClose();
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [open, handleClose]);

  /* ---------------- KEEP FADES IN SYNC ---------------- */

  useEffect(() => {
    if (!open) return;

    const body = bodyRef.current;
    const content = contentRef.current;

    if (!body || !content) return;

    updateScrollFx();

    const observer = new ResizeObserver(
      updateScrollFx
    );

    observer.observe(body);
    observer.observe(content);

    return () => observer.disconnect();
  }, [open, updateScrollFx]);

  /* ---------------- ACTIONS ---------------- */

  const handleCopy = async () => {
    try {
      await copyShareLink(shareData.url);

      setCopied(true);

      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current);
      }

      copyTimer.current = window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error(
        "Unable to copy share link:",
        error
      );
    }
  };

  const handleNativeShare = async () => {
    const result = await shareWithDevice(shareData);

    if (result.shared) {
      handleClose();
    }
  };

  const handleExternalShare = () => {
    handleClose();
  };

  if (!open) return null;

  const socials = [
    {
      label: "WhatsApp",
      href: getWhatsAppShareUrl(shareData),
      icon: <FaWhatsapp className="h-6 w-6" />,
      color: "text-[#25D366]",
    },
    {
      label: "X",
      href: getXShareUrl(shareData),
      icon: <FaXTwitter className="h-5 w-5" />,
      color: "text-[#000000]",
    },
    {
      label: "Telegram",
      href: getTelegramShareUrl(shareData),
      icon: <FaTelegram className="h-6 w-6" />,
      color: "text-[#229ED9]",
    },
    {
      label: "LinkedIn",
      href: getLinkedInShareUrl(shareData.url),
      icon: <FaLinkedinIn className="h-5 w-5" />,
      color: "text-[#0A66C2]",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-sheet-title"
      aria-describedby="share-sheet-description"
    >
      {/* Backdrop */}

      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-[3px] transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Positioning layer: bottom sheet on mobile, centered on desktop */}

      <div className="pointer-events-none absolute inset-0 flex items-end justify-center px-3 pb-3 sm:items-center sm:p-6">
        {/* Panel: grey canvas + themeable left ruler */}

        <div
          ref={panelRef}
          className={`pointer-events-auto relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[520px] origin-bottom flex-col rounded-[18px] border-l-[8px] border-l-[color:var(--blog-accent,#4a8fe7)] bg-[#f5f5f7] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif] shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition-all duration-[220ms] ease-out sm:max-h-[calc(100dvh-3rem)] sm:origin-center ${
            visible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-95 opacity-0"
          }`}
        >
          {/* ---------- HEADER (fixed above the scrolling body) ---------- */}

          <div className="relative z-20 mx-3 mt-3 flex shrink-0 items-center justify-between gap-3 rounded-[14px] px-5 py-3 sm:mx-4 sm:mt-4 sm:px-8">
            {/* Glass sheen layer, same as the blog modal header */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 rounded-[14px] ring-1 ring-black/[0.05]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.86) 100%)",
                backdropFilter:
                  "blur(16px) saturate(1.5)",
                WebkitBackdropFilter:
                  "blur(16px) saturate(1.5)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,1), 0 6px 22px rgba(0,0,0,calc(0.03 + 0.06 * var(--ft, 0)))",
              }}
            />

            <div className="relative flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8e8ed]">
                <img
                  src="/logo.png"
                  alt="Devvrats logo"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex min-w-0 items-baseline gap-x-1.5 text-[14px]">
                <span className="font-medium text-[#1d1d1f]">
                  Devvrats.
                </span>
                <h2
                  id="share-sheet-title"
                  className="text-[#6e6e73]"
                >
                  Share
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close share dialog"
              className="relative shrink-0 rounded-full p-1.5 text-[#6e6e73] transition-all duration-150 hover:bg-black/5 hover:text-[#1d1d1f] active:scale-90"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* ---------- SCROLLING BODY (cropped at the header edge) ---------- */}

          <div
            ref={bodyRef}
            onScroll={updateScrollFx}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-3 sm:px-4 sm:pb-4"
            style={{
              WebkitMaskImage: MASK,
              maskImage: MASK,
            }}
          >
            <div
              ref={contentRef}
              className="flex flex-col gap-3"
            >
              {/* ---------- BLOCK: PREVIEW ---------- */}

              <div
                id="share-sheet-description"
                className="rounded-[14px] bg-white px-5 py-5 sm:px-8 sm:py-6"
              >
                <p className="line-clamp-2 text-[17px] font-semibold leading-[1.3] tracking-[-0.01em] text-[#1d1d1f]">
                  {shareData.title}
                </p>

                {shareData.text && (
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-[#6e6e73]">
                    {shareData.text}
                  </p>
                )}

                <div className="mt-4 flex min-w-0 items-center gap-2 rounded-[12px] bg-[#f5f5f7] px-3.5 py-2.5 text-[12px] text-[#6e6e73]">
                  <LinkIcon className="h-3.5 w-3.5 shrink-0" />

                  <span className="truncate">
                    {shareData.url}
                  </span>
                </div>
              </div>

              {/* ---------- BLOCK: SHARE TO ---------- */}

              <div className="rounded-[14px] bg-white px-5 py-5 sm:px-8">
                {nativeShareSupported && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="mb-5 flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#1d1d1f] px-5 py-3 text-[13px] font-medium text-white transition-all duration-150 hover:bg-black active:scale-[0.98]"
                  >
                    <Monitor className="h-4 w-4" />
                    Share with Desktop
                  </button>
                )}

                <div className="grid grid-cols-4 gap-2.5">
                  {socials.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleExternalShare}
                      className="group flex flex-col items-center gap-2"
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#f5f5f7] transition-all duration-150 group-hover:scale-105 group-hover:bg-[#ededf0] group-active:scale-95 ${social.color}`}
                      >
                        {social.icon}
                      </div>

                      <span className="text-[12px] text-[#6e6e73]">
                        {social.label}
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              {/* ---------- BLOCK: COPY ---------- */}

              <div className="rounded-[14px] bg-white px-5 py-4 sm:px-8">
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-live="polite"
                  className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-[#d2d2d7] bg-white px-5 py-3 text-[13px] font-medium text-[#1d1d1f] transition-all duration-150 hover:bg-[#f5f5f7] active:scale-[0.98]"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}

                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}