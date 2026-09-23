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
        className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-t-[18px] border border-[#d2d2d7] bg-[#f5f5f7] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:rounded-[18px] sm:shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
      >
        {/* Mobile handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[#d2d2d7]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#e8e8ed]">
                <img
                  src="/logo.png"
                  alt="Devvrats logo"
                  className="h-full w-full object-cover"
                />
              </div>

              <span className="text-[13px] font-medium tracking-[-0.01em] text-[#1d1d1f]">
                Devvrats.
              </span>
            </div>

            <h2
              id="share-sheet-title"
              className="text-[28px] font-semibold leading-[1.1] tracking-[-0.022em] text-[#1d1d1f]"
            >
              Share
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#6e6e73] transition-colors hover:bg-black/5 hover:text-[#1d1d1f] active:scale-95"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Preview */}
        <div className="mx-5 overflow-hidden rounded-[18px] border-l-[8px] border-l-[#4a8fe7] bg-white px-4 py-4 sm:mx-6">
          <p className="line-clamp-2 text-[15px] font-medium leading-5 text-[#1d1d1f]">
            {shareData.title}
          </p>

          {shareData.text && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-[#6e6e73]">
              {shareData.text}
            </p>
          )}

          <div className="mt-3 flex min-w-0 items-center gap-2 text-[12px] text-[#6e6e73]">
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
      className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#1d1d1f] px-5 py-3 text-[13px] font-medium text-white transition-all hover:bg-black active:scale-[0.98]"
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
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#e4efd0] text-[#4d6d1f] transition-all group-hover:scale-105 group-hover:bg-[#d8e8bd]">
              <MessageCircle className="h-5 w-5" />
            </div>

            <span className="text-[12px] text-[#6e6e73]">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#e8e8ed] text-[#1d1d1f] transition-all group-hover:scale-105 group-hover:bg-[#dcdce1]">
              <X className="h-5 w-5" />
            </div>

            <span className="text-[12px] text-[#6e6e73]">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#d6e4f8] text-[#1a4a8f] transition-all group-hover:scale-105 group-hover:bg-[#c8dbf3]">
              <Send className="h-5 w-5" />
            </div>

            <span className="text-[12px] text-[#6e6e73]">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#fbe5d3] text-[#b5470f] transition-all group-hover:scale-105 group-hover:bg-[#f8d9c0]">
              <span className="text-[15px] font-semibold">
                in
              </span>
            </div>

            <span className="text-[12px] text-[#6e6e73]">
              LinkedIn
            </span>
          </a>
        </div>

        {/* Copy */}
        <div className="px-5 pb-6 pt-5 sm:px-6 sm:pb-6">
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-[#d2d2d7] bg-white px-5 py-3 text-[13px] font-medium text-[#1d1d1f] transition-all hover:bg-[#ededf0] active:scale-[0.98]"
          >
            <Copy className="h-4 w-4" />

            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}