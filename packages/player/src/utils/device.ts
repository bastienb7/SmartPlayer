export function isSafari(): boolean {
  return (
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent) &&
    !("chrome" in window)
  );
}

export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function supportsHLS(): boolean {
  const video = document.createElement("video");
  return video.canPlayType("application/vnd.apple.mpegurl") !== "";
}

/** Simple fingerprint for viewer identification (non-PII) */
export function getViewerFingerprint(): string {
  const stored = localStorage.getItem("sp_fp");
  if (stored) return stored;

  const fp = generateFingerprint();
  try {
    localStorage.setItem("sp_fp", fp);
  } catch {
    // Ignore
  }
  return fp;
}

function generateFingerprint(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = '14px "Arial"';
    ctx.fillText("smartplayer", 2, 2);
  }

  const parts = [
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset().toString(),
    canvas.toDataURL().slice(-50),
    Math.random().toString(36).slice(2, 10),
  ];

  return hashSimple(parts.join("|"));
}

function hashSimple(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + Date.now().toString(36);
}

export function generateSessionId(): string {
  return (
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}
