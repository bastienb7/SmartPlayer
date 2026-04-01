"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save, Play, Pause, Eye, Timer, MousePointer, Gauge, Loader2, Check, AlertCircle,
  Volume2, Maximize, SkipBack, SkipForward, Settings,
} from "lucide-react";
import { api } from "@/lib/api-client";

interface ToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  icon?: React.ReactNode;
}

function FeatureToggle({ label, description, enabled, onToggle, icon }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <div>
          <div className="font-medium text-sm">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

export default function PlayerConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [posterUrl, setPosterUrl] = useState("");

  const [autoplayConfig, setAutoplayConfig] = useState<any>({
    enabled: true,
    mutedMessage: "Your video has already started",
    clickMessage: "Click to listen",
    overlayOpacity: 0.85,
  });

  const [progressBarConfig, setProgressBarConfig] = useState<any>({
    enabled: true,
    fictitious: true,
    fastPhaseEnd: 0.2,
    slowPhaseEnd: 0.8,
    fastPhaseDisplay: 0.5,
    slowPhaseDisplay: 0.85,
  });

  const [recoveryThumbnailConfig, setRecoveryThumbnailConfig] = useState<any>({
    enabled: false, imageUrl: "", delayMs: 2000, message: "",
  });

  const [resumePlayConfig, setResumePlayConfig] = useState<any>({
    enabled: true, maxAgeDays: 7, promptMessage: "Continue where you left off?",
  });

  const [miniHookConfig, setMiniHookConfig] = useState<any>({ enabled: false, hooks: [] });
  const [turboSpeedConfig, setTurboSpeedConfig] = useState<any>({ enabled: false, minSpeed: 0.95, maxSpeed: 1.15 });
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const [styleConfig, setStyleConfig] = useState({
    primaryColor: "#6366f1",
    backgroundColor: "#000000",
    controlsBackground: "rgba(0,0,0,0.7)",
    controlsColor: "#ffffff",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    borderRadius: 8,
    showControls: true,
    showBigPlayButton: false,
    showSmallPlayButton: true,
    showRewind: false,
    showFastForward: false,
    showSpeedControl: false,
    showProgressBar: true,
    showVideoTimer: true,
    showVolume: true,
    showFullscreen: true,
    controlsAutoHide: true,
    controlsAutoHideMs: 3000,
  });

  useEffect(() => {
    Promise.all([
      api.getPlayerConfig(id),
      api.getVideo(id).catch(() => null),
    ]).then(([player, videoData]) => {
      if (player.autoplayConfig) setAutoplayConfig(player.autoplayConfig);
      if (player.progressBarConfig) setProgressBarConfig(player.progressBarConfig);
      if (player.recoveryThumbnailConfig) setRecoveryThumbnailConfig(player.recoveryThumbnailConfig);
      if (player.resumePlayConfig) setResumePlayConfig(player.resumePlayConfig);
      if (player.miniHookConfig) setMiniHookConfig(player.miniHookConfig);
      if (player.turboSpeedConfig) setTurboSpeedConfig(player.turboSpeedConfig);
      if (player.styleConfig) setStyleConfig((prev) => ({ ...prev, ...player.styleConfig }));
      if (player.analyticsEnabled !== undefined) setAnalyticsEnabled(player.analyticsEnabled);
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
      await api.updatePlayerConfig(id, {
        autoplayConfig, progressBarConfig, recoveryThumbnailConfig,
        resumePlayConfig, miniHookConfig, turboSpeedConfig, styleConfig, analyticsEnabled,
      });
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
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Player Settings</h1>
          <p className="text-muted-foreground">Configure the player appearance and behavior.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* ===== LIVE PREVIEW ===== */}
      <Card className="mb-6">
        <CardTitle className="mb-3 text-base uppercase tracking-wide text-muted-foreground">Live Preview</CardTitle>
        <CardContent className="p-0">
          <div
            className="relative w-full aspect-video overflow-hidden"
            style={{ backgroundColor: styleConfig.backgroundColor, borderRadius: `${styleConfig.borderRadius}px` }}
          >
            {/* Video poster background */}
            {posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
            )}

            {/* Autoplay overlay */}
            {autoplayConfig.enabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ backgroundColor: `rgba(0,0,0,${autoplayConfig.overlayOpacity || 0.85})` }}>
                <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center mb-3 cursor-pointer" style={{ borderColor: styleConfig.primaryColor }}>
                  <Volume2 className="w-7 h-7" style={{ color: styleConfig.primaryColor }} />
                </div>
                <p className="text-white text-sm font-medium mb-1">{autoplayConfig.mutedMessage || "Your video has already started"}</p>
                <p className="text-sm font-semibold" style={{ color: styleConfig.primaryColor }}>{autoplayConfig.clickMessage || "Click to listen"}</p>
              </div>
            )}

            {/* Big play button (when no autoplay) */}
            {!autoplayConfig.enabled && styleConfig.showBigPlayButton && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: styleConfig.primaryColor }}>
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </div>
              </div>
            )}

            {/* Controls bar */}
            {styleConfig.showControls && (
              <div className="absolute bottom-0 left-0 right-0 z-20">
                {/* Progress bar */}
                {styleConfig.showProgressBar && (
                  <div className="px-3 pb-1">
                    <div className="h-1 rounded-full bg-white/20 relative group cursor-pointer">
                      <div className="h-full rounded-full" style={{ width: "35%", backgroundColor: styleConfig.primaryColor }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow" style={{ left: "35%", marginLeft: "-6px", backgroundColor: styleConfig.primaryColor }} />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: styleConfig.controlsBackground }}>
                  {/* Left controls */}
                  <div className="flex items-center gap-2" style={{ color: styleConfig.controlsColor }}>
                    {styleConfig.showSmallPlayButton && <Play className="w-4 h-4" />}
                    {styleConfig.showRewind && <SkipBack className="w-4 h-4" />}
                    {styleConfig.showFastForward && <SkipForward className="w-4 h-4" />}
                    {styleConfig.showVideoTimer && <span className="text-xs font-mono">0:15 / 0:43</span>}
                  </div>
                  <div className="flex-1" />
                  {/* Right controls */}
                  <div className="flex items-center gap-2" style={{ color: styleConfig.controlsColor }}>
                    {styleConfig.showSpeedControl && <span className="text-xs font-medium">1x</span>}
                    {styleConfig.showVolume && <Volume2 className="w-4 h-4" />}
                    {styleConfig.showFullscreen && <Maximize className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== STYLE & COLORS ===== */}
      <Card className="mb-6">
        <CardTitle className="mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Appearance
        </CardTitle>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={styleConfig.primaryColor} onChange={(e) => setStyleConfig((c) => ({ ...c, primaryColor: e.target.value }))} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <Input value={styleConfig.primaryColor} onChange={(e) => setStyleConfig((c) => ({ ...c, primaryColor: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Controls Color</label>
              <div className="flex gap-2">
                <input type="color" value={styleConfig.controlsColor} onChange={(e) => setStyleConfig((c) => ({ ...c, controlsColor: e.target.value }))} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <Input value={styleConfig.controlsColor} onChange={(e) => setStyleConfig((c) => ({ ...c, controlsColor: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Background Color</label>
              <div className="flex gap-2">
                <input type="color" value={styleConfig.backgroundColor} onChange={(e) => setStyleConfig((c) => ({ ...c, backgroundColor: e.target.value }))} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <Input value={styleConfig.backgroundColor} onChange={(e) => setStyleConfig((c) => ({ ...c, backgroundColor: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Border Radius</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="24" value={styleConfig.borderRadius} onChange={(e) => setStyleConfig((c) => ({ ...c, borderRadius: parseInt(e.target.value) }))} className="flex-1" />
                <span className="text-xs text-muted-foreground w-10">{styleConfig.borderRadius}px</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Controls Bar Background</label>
              <select value={styleConfig.controlsBackground} onChange={(e) => setStyleConfig((c) => ({ ...c, controlsBackground: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                <option value="rgba(0,0,0,0.7)">Dark (70%)</option>
                <option value="rgba(0,0,0,0.5)">Medium (50%)</option>
                <option value="rgba(0,0,0,0.3)">Light (30%)</option>
                <option value="rgba(0,0,0,0.9)">Very dark (90%)</option>
                <option value="transparent">Transparent</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== CONTROLS VISIBILITY ===== */}
      <Card className="mb-6">
        <CardTitle className="mb-4">Controls Visibility</CardTitle>
        <CardContent>
          <FeatureToggle label="Show Controls" description="Display the controls bar at the bottom of the player" enabled={styleConfig.showControls} onToggle={(v) => setStyleConfig((c) => ({ ...c, showControls: v }))} />
          {styleConfig.showControls && (
            <>
              <FeatureToggle label="Progress Bar" description="Seekable timeline bar" enabled={styleConfig.showProgressBar} onToggle={(v) => setStyleConfig((c) => ({ ...c, showProgressBar: v }))} />
              <FeatureToggle label="Play/Pause Button" description="Small play/pause in the controls bar" enabled={styleConfig.showSmallPlayButton} onToggle={(v) => setStyleConfig((c) => ({ ...c, showSmallPlayButton: v }))} />
              <FeatureToggle label="Video Timer" description="Show current time / total duration" enabled={styleConfig.showVideoTimer} onToggle={(v) => setStyleConfig((c) => ({ ...c, showVideoTimer: v }))} />
              <FeatureToggle label="Volume" description="Volume control icon" enabled={styleConfig.showVolume} onToggle={(v) => setStyleConfig((c) => ({ ...c, showVolume: v }))} />
              <FeatureToggle label="Fullscreen" description="Fullscreen toggle button" enabled={styleConfig.showFullscreen} onToggle={(v) => setStyleConfig((c) => ({ ...c, showFullscreen: v }))} />
              <FeatureToggle label="Rewind (10s)" description="Skip back 10 seconds button" enabled={styleConfig.showRewind} onToggle={(v) => setStyleConfig((c) => ({ ...c, showRewind: v }))} />
              <FeatureToggle label="Fast Forward (10s)" description="Skip ahead 10 seconds button" enabled={styleConfig.showFastForward} onToggle={(v) => setStyleConfig((c) => ({ ...c, showFastForward: v }))} />
              <FeatureToggle label="Speed Control" description="Playback speed selector (1x, 1.5x, 2x)" enabled={styleConfig.showSpeedControl} onToggle={(v) => setStyleConfig((c) => ({ ...c, showSpeedControl: v }))} />
              <FeatureToggle label="Big Play Button" description="Large centered play button on the video (when paused)" enabled={styleConfig.showBigPlayButton} onToggle={(v) => setStyleConfig((c) => ({ ...c, showBigPlayButton: v }))} />
              <FeatureToggle label="Auto-hide Controls" description="Controls disappear after a few seconds of inactivity" enabled={styleConfig.controlsAutoHide} onToggle={(v) => setStyleConfig((c) => ({ ...c, controlsAutoHide: v }))} />
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== SMART AUTOPLAY ===== */}
      <Card className="mb-6">
        <CardTitle className="mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" /> Smart Autoplay
        </CardTitle>
        <CardContent>
          <FeatureToggle label="Enable Smart Autoplay" description="Video starts playing muted with a persuasive overlay to get the viewer to click" enabled={autoplayConfig.enabled} onToggle={(v) => setAutoplayConfig((c: any) => ({ ...c, enabled: v }))} />
          {autoplayConfig.enabled && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Muted Message</label>
                <Input value={autoplayConfig.mutedMessage} onChange={(e) => setAutoplayConfig((c: any) => ({ ...c, mutedMessage: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Click Message</label>
                <Input value={autoplayConfig.clickMessage} onChange={(e) => setAutoplayConfig((c: any) => ({ ...c, clickMessage: e.target.value }))} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== FICTITIOUS PROGRESS ===== */}
      <Card className="mb-6">
        <CardTitle className="mb-4 flex items-center gap-2">
          <Timer className="w-5 h-5 text-primary" /> Fictitious Progress Bar
        </CardTitle>
        <CardContent>
          <FeatureToggle label="Enable Fictitious Progress" description="Progress bar moves fast at start, making videos feel shorter — improves retention" enabled={progressBarConfig.fictitious} onToggle={(v) => setProgressBarConfig((c: any) => ({ ...c, fictitious: v }))} />
          {progressBarConfig.fictitious && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Fast Phase End (0-1)</label>
                <Input type="number" step="0.05" min="0" max="1" value={progressBarConfig.fastPhaseEnd} onChange={(e) => setProgressBarConfig((c: any) => ({ ...c, fastPhaseEnd: parseFloat(e.target.value) }))} />
                <p className="text-xs text-muted-foreground mt-1">First 20% of video = fast progress (feels like 50% done)</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Slow Phase End (0-1)</label>
                <Input type="number" step="0.05" min="0" max="1" value={progressBarConfig.slowPhaseEnd} onChange={(e) => setProgressBarConfig((c: any) => ({ ...c, slowPhaseEnd: parseFloat(e.target.value) }))} />
                <p className="text-xs text-muted-foreground mt-1">Middle of video = slow progress (keeps viewer engaged)</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== ENGAGEMENT FEATURES ===== */}
      <Card className="mb-6">
        <CardTitle className="mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" /> Engagement Features
        </CardTitle>
        <CardContent>
          <FeatureToggle label="Recovery Thumbnail" description="Show a clickable image when the video is paused — re-engages distracted viewers" enabled={recoveryThumbnailConfig.enabled} onToggle={(v) => setRecoveryThumbnailConfig((c: any) => ({ ...c, enabled: v }))} icon={<Eye className="w-4 h-4" />} />
          <FeatureToggle label="Resume Play" description="Returning visitors can continue where they left off" enabled={resumePlayConfig.enabled} onToggle={(v) => setResumePlayConfig((c: any) => ({ ...c, enabled: v }))} icon={<Pause className="w-4 h-4" />} />
          <FeatureToggle label="Mini-Hook" description="Short text notifications at 25%, 50%, 75% to keep attention" enabled={miniHookConfig.enabled} onToggle={(v) => setMiniHookConfig((c: any) => ({ ...c, enabled: v }))} icon={<MousePointer className="w-4 h-4" />} />
          <FeatureToggle label="Turbo Speed" description="Slightly speed up playback (0.95x-1.15x) — A/B test for best conversion" enabled={turboSpeedConfig.enabled} onToggle={(v) => setTurboSpeedConfig((c: any) => ({ ...c, enabled: v }))} icon={<Gauge className="w-4 h-4" />} />
          <FeatureToggle label="Analytics" description="Track all viewer events (plays, pauses, CTA clicks, watch time)" enabled={analyticsEnabled} onToggle={setAnalyticsEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
