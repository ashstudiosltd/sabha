"use client";

import {
  Copy,
  Link as LinkIcon,
  MessageCircle,
  Send,
  Share2,
  X,
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
      <div className="absolute inset-0 bg-[#1B1B18]/35 backdrop-blur-[3px]" />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
        aria-describedby="share-sheet-description"
        className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-t-[24px] border border-[#E6E3DA] bg-[#FAFAF7] shadow-[0_-12px_50px_rgba(27,27,24,0.15)] sm:rounded-[24px] sm:shadow-[0_24px_80px_rgba(27,27,24,0.18)]"
      >
        {/* Mobile handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[#D7D3C9]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E9EEE9] text-[#2F4B3C]">
                <Share2 className="h-4 w-4" />
              </div>

              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A8577]">
                Devvrats
              </span>
            </div>

            <h2
              id="share-sheet-title"
              className="text-[20px] font-semibold tracking-[-0.02em] text-[#1B1B18]"
            >
              Share
            </h2>

            <p
              id="share-sheet-description"
              className="mt-1 text-[13px] leading-5 text-[#8A8577]"
            >
              Share this with your community.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#8A8577] transition-colors hover:bg-[#EDEAE2] hover:text-[#1B1B18] active:scale-95"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Preview */}
        <div className="mx-5 rounded-[16px] border border-[#E6E3DA] bg-white px-4 py-4 sm:mx-6">
          <p className="line-clamp-2 text-[14px] font-medium leading-5 text-[#1B1B18]">
            {shareData.title}
          </p>

          {shareData.text && (
            <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-5 text-[#777268]">
              {shareData.text}
            </p>
          )}

          <div className="mt-3 flex min-w-0 items-center gap-2 text-[11.5px] text-[#9A958A]">
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
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1B1B18] px-5 py-3 text-[13px] font-medium text-[#FAFAF7] transition-all hover:bg-[#2F4B3C] active:scale-[0.98]"
            >
              <Share2 className="h-4 w-4" />
              Share with device
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E9EEE9] text-[#2F4B3C] transition-all group-hover:scale-105 group-hover:bg-[#DDE7DF]">
              <MessageCircle className="h-5 w-5" />
            </div>

            <span className="text-[11px] text-[#777268]">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ECEBE7] text-[#1B1B18] transition-all group-hover:scale-105 group-hover:bg-[#E3E2DD]">
              <X className="h-5 w-5" />
            </div>

            <span className="text-[11px] text-[#777268]">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8EEF1] text-[#356174] transition-all group-hover:scale-105 group-hover:bg-[#DCE7EC]">
              <Send className="h-5 w-5" />
            </div>

            <span className="text-[11px] text-[#777268]">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8EDF2] text-[#315B79] transition-all group-hover:scale-105 group-hover:bg-[#DDE6ED]">
              <span className="text-[15px] font-semibold">
                in
              </span>
            </div>

            <span className="text-[11px] text-[#777268]">
              LinkedIn
            </span>
          </a>
        </div>

        {/* Copy */}
        <div className="px-5 pb-6 pt-5 sm:px-6 sm:pb-6">
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#DCD8CF] bg-transparent px-5 py-3 text-[13px] font-medium text-[#1B1B18] transition-all hover:bg-[#F0EEE8] active:scale-[0.98]"
          >
            <Copy className="h-4 w-4" />

            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}