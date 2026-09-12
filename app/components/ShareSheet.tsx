"use client";

import {
  Copy,
  Link as LinkIcon,
  MessageCircle,
  Send,
  Share2,
  X,
  Monitor,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  copyShareLink,
  getLinkedInShareUrl,
  getTelegramShareUrl,
  getWhatsAppShareUrl,
  getXShareUrl,
  shareWithDevice,
  type DevvratsShareData,
} from "@/lib/share/share";

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
  const [copied, setCopied] = useState(false);
  const [nativeShareSupported, setNativeShareSupported] =
    useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setNativeShareSupported(
        typeof navigator.share === "function"
      );
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
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
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await copyShareLink(shareData.url);

      setCopied(true);

      window.setTimeout(() => {
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
    const result = await shareWithDevice(
      shareData
    );

    if (result.shared) {
      onClose();
    }
  };

  const handleExternalShare = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
        aria-describedby="share-sheet-description"
        className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-t-[24px] border border-white/15 bg-white/10 shadow-[0_-12px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:rounded-[24px] sm:shadow-[0_24px_80px_rgba(0,0,0,0.4)]"
      >
        {/* Mobile handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/25" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/15">
                <img
                  src="/logo.png"
                  alt="Devvrats logo"
                  className="h-full w-full object-cover"
                />
              </div>

              <span className="text-[11px] font-medium tracking-[0.14em] text-white/60">
                Devvrats.
              </span>
            </div>

            <h2
              id="share-sheet-title"
              className="text-[20px] font-semibold tracking-[-0.02em] text-white"
            >
              Share
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-95"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Preview */}
        <div className="mx-5 rounded-[16px] border border-white/15 bg-white/5 px-4 py-4 sm:mx-6">
          <p className="line-clamp-2 text-[14px] font-medium leading-5 text-white">
            {shareData.title}
          </p>

          {shareData.text && (
            <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-5 text-white/70">
              {shareData.text}
            </p>
          )}

          <div className="mt-3 flex min-w-0 items-center gap-2 text-[11.5px] text-white/50">
            <LinkIcon className="h-3.5 w-3.5 shrink-0" />

            <span className="truncate">
              {shareData.url}
            </span>
          </div>
        </div>

        {/* Native share */}
       {nativeShareSupported && (
  <div className="px-5 pt-5 sm:px-6">
    <button
      type="button"
      onClick={handleNativeShare}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-[13px] font-medium text-[#1B1B18] transition-all hover:bg-white/90 active:scale-[0.98]"
    >
      <Monitor className="h-4 w-4" />
      Share with Desktop
    </button>
  </div>
)}

        {/* Social options */}
        <div className="grid grid-cols-4 gap-2.5 px-5 pt-5 sm:px-6">
          <a
            href={getWhatsAppShareUrl(
              shareData
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleExternalShare}
            className="group flex flex-col items-center gap-2"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2F4B3C]/30 text-[#8FCBA3] transition-all group-hover:scale-105 group-hover:bg-[#2F4B3C]/45">
              <MessageCircle className="h-5 w-5" />
            </div>

            <span className="text-[11px] text-white/60">
              WhatsApp
            </span>
          </a>

          <a
            href={getXShareUrl(shareData)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleExternalShare}
            className="group flex flex-col items-center gap-2"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition-all group-hover:scale-105 group-hover:bg-white/25">
              <X className="h-5 w-5" />
            </div>

            <span className="text-[11px] text-white/60">
              X
            </span>
          </a>

          <a
            href={getTelegramShareUrl(
              shareData
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleExternalShare}
            className="group flex flex-col items-center gap-2"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#356174]/35 text-[#8FC4DA] transition-all group-hover:scale-105 group-hover:bg-[#356174]/50">
              <Send className="h-5 w-5" />
            </div>

            <span className="text-[11px] text-white/60">
              Telegram
            </span>
          </a>

          <a
            href={getLinkedInShareUrl(
              shareData.url
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleExternalShare}
            className="group flex flex-col items-center gap-2"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#315B79]/35 text-[#89BEDD] transition-all group-hover:scale-105 group-hover:bg-[#315B79]/50">
              <span className="text-[15px] font-semibold">
                in
              </span>
            </div>

            <span className="text-[11px] text-white/60">
              LinkedIn
            </span>
          </a>
        </div>

        {/* Copy */}
        <div className="px-5 pb-6 pt-5 sm:px-6 sm:pb-6">
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-5 py-3 text-[13px] font-medium text-white transition-all hover:bg-white/10 active:scale-[0.98]"
          >
            <Copy className="h-4 w-4" />

            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}