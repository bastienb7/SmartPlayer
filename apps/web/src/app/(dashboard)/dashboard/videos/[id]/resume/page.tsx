"use client";

import { use, useEffect, useState, useRef } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw, Save, Loader2, Check, AlertCircle, Play, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumePlayConfig {
  enabled: boolean;
  maxAgeDays: number;
  promptMessage: string;
  continueLabel: string;
  restartLabel: string;
  overlayColor: string;
  overlayOpacity: number;
  textColor: string;
  continueBtnColor: string;
  continueBtnTextColor: string;
  restartBtnColor: string;
  restartBtnTextColor: string;
  showProgress: boolean;
  backdropBlur: boolean;
  autoResumeSeconds: number;
}

const defaultConfig: ResumePlayConfig = {
  enabled: true,
  maxAgeDays: 7,
  promptMessage: "You already started watching this video",
  continueLabel: "Continue watching",
  restartLabel: "Start from beginning",
  overlayColor: "#000000",
  overlayOpacity: 0.82,
  textColor: "#ffffff",
  continueBtnColor: "#10b981",
  continueBtnTextColor: "#ffffff",
  restartBtnColor: "rgba(255,255,255,0.12)",
  restartBtnTextColor: "#ffffff",
  showProgress: true,
  backdropBlur: true,
  autoResumeSeconds: 0,
};

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ label, description, enabled, onToggle }: { label: string; description: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border last:border-0">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

function ResumePreview({ config, posterUrl }: { config: ResumePlayConfig; posterUrl: string }) {
  const [countdown, setCountdown] = useState(config.autoResumeSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset and start countdown when config changes
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (config.autoResumeSeconds > 0) {
      setCountdown(config.autoResumeSeconds);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timerRef.current!); return 0; }
          return c - 1;
        });
      }, 1000);
    } else {
      setCountdown(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [config.autoResumeSeconds]);

  const overlayBg = `rgba(${hexToRgb(config.overlayColor)},${config.overlayOpacity})`;
  const savedProgress = 42; // simulated 42% progress for preview
  const savedTime = "2:07";
  const totalTime = "5:02";

  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "16/9" }}>
      {/* Poster / video background */}
      {posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
      )}

      {/* Backdrop blur layer */}
      {config.backdropBlur && (
        <div className="absolute inset-0" style={{ backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }} />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6"
        style={{ backgroundColor: overlayBg }}
      >
        {/* Progress indicator */}
        {config.showProgress && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: config.textColor, opacity: 0.7 }}>
              <span>Watched: {savedTime}</span>
              <span>{savedProgress}% · {totalTime} total</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 w-full">
              <div className="h-full rounded-full" style={{ width: `${savedProgress}%`, backgroundColor: config.continueBtnColor }} />
            </div>
          </div>
        )}

        {/* Message */}
        <p className="text-base font-semibold text-center leading-snug" style={{ color: config.textColor }}>
          {config.promptMessage || "You already started watching this video"}
        </p>

        {/* Auto-resume countdown */}
        {config.autoResumeSeconds > 0 && countdown > 0 && (
          <p className="text-xs" style={{ color: config.textColor, opacity: 0.7 }}>
            Resuming automatically in <span className="font-bold" style={{ color: config.continueBtnColor }}>{countdown}s</span>…
          </p>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: config.continueBtnColor, color: config.continueBtnTextColor }}
          >
            <Play className="w-4 h-4" fill="currentColor" />
            {config.continueLabel || "Continue watching"}
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm border transition-opacity hover:opacity-80"
            style={{
              backgroundColor: config.restartBtnColor,
              color: config.restartBtnTextColor,
              borderColor: "rgba(255,255,255,0.15)",
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {config.restartLabel || "Start from beginning"}
          </button>
        </div>
      </div>
    </div>
  );
}

// hex → "r,g,b"
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `${r},${g},${b}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResumePlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [config, setConfig] = useState<ResumePlayConfig>(defaultConfig);
  const [posterUrl, setPosterUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof ResumePlayConfig, value: any) =>
    setConfig((c) => ({ ...c, [key]: value }));

  useEffect(() => {
    Promise.all([
      api.getPlayerConfig(id),
      api.getVideo(id).catch(() => null),
    ]).then(([player, videoData]) => {
      const r = player.resumePlayConfig;
      if (r && typeof r === "object" && Object.keys(r).length > 0) {
        setConfig({ ...defaultConfig, ...r });
      }
      const v = videoData?.video || videoData;
      if (v) setPosterUrl(v.posterUrl || v.poster_url || "");
    })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api.updatePlayerConfig(id, { resumePlayConfig: config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-primary" /> Resume Play
          </h1>
          <p className="text-muted-foreground">
            Let returning viewers pick up exactly where they left off.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Saved!" : "Save"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Enable */}
      <Card>
        <Toggle
          label="Enable Resume Play"
          description="When a returning viewer lands on the page, show them an overlay to resume or restart"
          enabled={config.enabled}
          onToggle={(v) => set("enabled", v)}
        />
      </Card>

      {config.enabled && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">

          {/* ── LEFT: Settings ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* MESSAGE & BUTTONS */}
            <Card>
              <CardTitle className="mb-4">Message & Buttons</CardTitle>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Overlay Message</label>
                    <Input
                      value={config.promptMessage}
                      onChange={(e) => set("promptMessage", e.target.value)}
                      placeholder="You already started watching this video"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Continue Button Label</label>
                      <Input
                        value={config.continueLabel}
                        onChange={(e) => set("continueLabel", e.target.value)}
                        placeholder="Continue watching"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Restart Button Label</label>
                      <Input
                        value={config.restartLabel}
                        onChange={(e) => set("restartLabel", e.target.value)}
                        placeholder="Start from beginning"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* OVERLAY STYLE */}
            <Card>
              <CardTitle className="mb-4">Overlay Style</CardTitle>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Background Color</label>
                    <div className="flex gap-2">
                      <input type="color" value={config.overlayColor} onChange={(e) => set("overlayColor", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                      <Input value={config.overlayColor} onChange={(e) => set("overlayColor", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Background Opacity</label>
                    <div className="flex items-center gap-2 h-10">
                      <input type="range" min="0.3" max="1" step="0.05" value={config.overlayOpacity}
                        onChange={(e) => set("overlayOpacity", parseFloat(e.target.value))} className="flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{Math.round(config.overlayOpacity * 100)}%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Text Color</label>
                    <div className="flex gap-2">
                      <input type="color" value={config.textColor} onChange={(e) => set("textColor", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                      <Input value={config.textColor} onChange={(e) => set("textColor", e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <Toggle label="Backdrop Blur" description="Blur the video frame behind the overlay (more modern look)" enabled={config.backdropBlur} onToggle={(v) => set("backdropBlur", v)} />
                  <Toggle label="Show Progress Bar" description="Display how far the viewer got last time (e.g. 42% · 2:07)" enabled={config.showProgress} onToggle={(v) => set("showProgress", v)} />
                </div>
              </CardContent>
            </Card>

            {/* BUTTON COLORS */}
            <Card>
              <CardTitle className="mb-4">Button Colors</CardTitle>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-primary">Continue button</p>
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">Background</label>
                      <div className="flex gap-2">
                        <input type="color" value={config.continueBtnColor} onChange={(e) => set("continueBtnColor", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                        <Input value={config.continueBtnColor} onChange={(e) => set("continueBtnColor", e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">Text Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={config.continueBtnTextColor} onChange={(e) => set("continueBtnTextColor", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                        <Input value={config.continueBtnTextColor} onChange={(e) => set("continueBtnTextColor", e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Restart button</p>
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">Background</label>
                      <div className="flex gap-2">
                        <input type="color" value={config.restartBtnColor.startsWith("rgba") ? "#ffffff" : config.restartBtnColor} onChange={(e) => set("restartBtnColor", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                        <Input value={config.restartBtnColor} onChange={(e) => set("restartBtnColor", e.target.value)} placeholder="rgba(255,255,255,0.12)" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">Text Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={config.restartBtnTextColor} onChange={(e) => set("restartBtnTextColor", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                        <Input value={config.restartBtnTextColor} onChange={(e) => set("restartBtnTextColor", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BEHAVIOR */}
            <Card>
              <CardTitle className="mb-4">Behavior</CardTitle>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Max Age (days)</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min="1" max="90" value={config.maxAgeDays}
                        onChange={(e) => set("maxAgeDays", parseInt(e.target.value))} className="flex-1" />
                      <span className="text-sm text-muted-foreground w-20">{config.maxAgeDays} day{config.maxAgeDays > 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Saved position expires after this period of inactivity.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Auto-Resume Countdown</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min="0" max="10" value={config.autoResumeSeconds}
                        onChange={(e) => set("autoResumeSeconds", parseInt(e.target.value))} className="flex-1" />
                      <span className="text-sm text-muted-foreground w-20">
                        {config.autoResumeSeconds === 0 ? "Off" : `${config.autoResumeSeconds}s`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {config.autoResumeSeconds === 0
                        ? "Viewer must click to resume."
                        : `Automatically resumes after ${config.autoResumeSeconds}s unless the viewer clicks "Start from beginning".`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT: Sticky live preview ─────────────────────────────────── */}
          <div className="xl:sticky xl:top-6">
            <Card className="overflow-hidden">
              <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border">
                <span className="text-sm font-semibold">Live Preview</span>
                <span className="text-xs text-muted-foreground">Updates instantly</span>
              </div>
              <div className="p-4">
                <ResumePreview config={config} posterUrl={posterUrl} />
              </div>
              <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-1">
                <p className="text-xs text-muted-foreground">
                  This overlay appears when a returning viewer lands on the page.
                </p>
                {config.autoResumeSeconds > 0 && (
                  <p className="text-xs text-primary font-medium">
                    Auto-resumes in {config.autoResumeSeconds}s — countdown resets in the preview above.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
