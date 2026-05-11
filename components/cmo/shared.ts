export const ACCENT = "#ff1744";
export const ACCENT_DIM = "#8a0a22";
export const BG = "#0a0a0c";
export const BG_2 = "#121215";
export const BG_3 = "#1a1a1f";
export const INK = "#f5f1e8";
export const MUTED = "#7a7a82";

export type PlatformStyle = { bg: string; fg: string; label: string };

export const PLATFORM_STYLES: Record<string, PlatformStyle> = {
  X: { bg: "#000", fg: "#fff", label: "X" },
  TikTok: { bg: "#010101", fg: "#25F4EE", label: "TIKTOK" },
  YouTube: { bg: "#FF0000", fg: "#fff", label: "YOUTUBE" },
  Instagram: { bg: "#E4405F", fg: "#fff", label: "INSTAGRAM" },
  LinkedIn: { bg: "#0A66C2", fg: "#fff", label: "LINKEDIN" },
  Reddit: { bg: "#FF4500", fg: "#fff", label: "REDDIT" },
};

export function platformStyle(platform: string): PlatformStyle {
  return (
    PLATFORM_STYLES[platform] || {
      bg: ACCENT_DIM,
      fg: INK,
      label: platform.toUpperCase(),
    }
  );
}

export type ResearchStep = {
  label: string;
  finding?: string | null;
  status: "running" | "done" | "pending";
};
