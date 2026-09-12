export interface DevvratsShareData {
  title: string;
  text?: string;
  url: string;
}

export async function shareWithDevice(
  data: DevvratsShareData
): Promise<{
  shared: boolean;
  cancelled: boolean;
  error: string | null;
}> {
  if (
    typeof navigator === "undefined" ||
    !navigator.share
  ) {
    return {
      shared: false,
      cancelled: false,
      error: "Native sharing is not supported.",
    };
  }

  try {
    await navigator.share({
      title: data.title,
      text: data.text,
      url: data.url,
    });

    return {
      shared: true,
      cancelled: false,
      error: null,
    };
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      return {
        shared: false,
        cancelled: true,
        error: null,
      };
    }

    console.error(
      "Native share failed:",
      error
    );

    return {
      shared: false,
      cancelled: false,
      error:
        "Unable to open the sharing menu.",
    };
  }
}

export function copyShareLink(
  url: string
): Promise<void> {
  return navigator.clipboard.writeText(url);
}

export function getWhatsAppShareUrl(
  data: DevvratsShareData
): string {
  const message = [
    data.title,
    data.text,
    data.url,
  ]
    .filter(Boolean)
    .join("\n\n");

  return `https://wa.me/?text=${encodeURIComponent(
    message
  )}`;
}

export function getTelegramShareUrl(
  data: DevvratsShareData
): string {
  return `https://t.me/share/url?url=${encodeURIComponent(
    data.url
  )}&text=${encodeURIComponent(
    data.title
  )}`;
}

export function getXShareUrl(
  data: DevvratsShareData
): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    data.title
  )}&url=${encodeURIComponent(
    data.url
  )}`;
}

export function getLinkedInShareUrl(
  url: string
): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    url
  )}`;
}