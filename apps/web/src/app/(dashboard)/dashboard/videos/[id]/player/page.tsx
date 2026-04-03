"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save, Play, Pause, Eye, Timer, MousePointer, Gauge, Loader2, Check, AlertCircle,
  Volume2, Maximize, SkipBack, SkipForward, Settings, Volume1, VolumeX,
} from "lucide-react";
import { api } from "@/lib/api-client";

// ─── Toggle component ────────────────────────────────────────────────────────

interface ToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  icon?: React.ReactNode;
}

function FeatureToggle({ label, description, enabled, onToggle, icon }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <div>
          <div className="font-medium text-sm">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
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

// ─── Live Player Preview ─────────────────────────────────────────────────────

interface PreviewProps {
  videoUrl?: string;
  posterUrl?: string;
  autoplayConfig: any;
  progressBarConfig: any;
  recoveryThumbnailConfig: any;
  styleConfig: any;
}

function LivePlayerPreview({ videoUrl, posterUrl, autoplayConfig, progressBarConfig, recoveryThumbnailConfig, styleConfig }: PreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAutoplayOverlay, setShowAutoplayOverlay] = useState(autoplayConfig.enabled);
  const [isPaused, setIsPaused] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load HLS when URL changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const isHLS = videoUrl.includes(".m3u8");

    if (isHLS) {
      import("hls.js").then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          if (hlsRef.current) hlsRef.current.destroy();
          const hls = new Hls({ startLevel: -1 });
          hlsRef.current = hls;
          hls.loadSource(videoUrl);
          hls.attachMedia(video);
          // Autoplay muted
          video.muted = true;
          video.play().catch(() => {});
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = videoUrl;
          video.muted = true;
          video.play().catch(() => {});
        }
      }).catch(() => {
        video.src = videoUrl;
      });
    } else {
      video.src = videoUrl;
      video.muted = true;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl]);

  // Sync autoplay overlay state when config changes
  useEffect(() => {
    setShowAutoplayOverlay(autoplayConfig.enabled);
  }, [autoplayConfig.enabled]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.duration) {
      const rawProgress = video.currentTime / video.duration;
      if (progressBarConfig.fictitious) {
        // Piecewise fictitious progress
        const { fastPhaseEnd = 0.2, slowPhaseEnd = 0.8, fastPhaseDisplay = 0.5, slowPhaseDisplay = 0.85 } = progressBarConfig;
        let display: number;
        if (rawProgress <= fastPhaseEnd) {
          display = (rawProgress / fastPhaseEnd) * fastPhaseDisplay;
        } else if (rawProgress <= slowPhaseEnd) {
          const t = (rawProgress - fastPhaseEnd) / (slowPhaseEnd - fastPhaseEnd);
          display = fastPhaseDisplay + t * (slowPhaseDisplay - fastPhaseDisplay);
        } else {
          const t = (rawProgress - slowPhaseEnd) / (1 - slowPhaseEnd);
          display = slowPhaseDisplay + t * (1 - slowPhaseDisplay);
        }
        setProgress(Math.min(display * 100, 100));
      } else {
        setProgress(rawProgress * 100);
      }
      setDuration(video.duration);
    }
  };

  const handlePlay = () => { setPlaying(true); setIsPaused(false); setShowRecovery(false); };
  const handlePause = () => {
    setPlaying(false);
    setIsPaused(true);
    if (recoveryThumbnailConfig.enabled) {
      setTimeout(() => setShowRecovery(true), recoveryThumbnailConfig.delayMs || 2000);
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.currentTime = 0;
    video.play();
    setMuted(false);
    setShowAutoplayOverlay(false);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    video.currentTime = ratio * video.duration;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
      setMuted(v === 0);
    }
  };

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (styleConfig.controlsAutoHide) {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), styleConfig.controlsAutoHideMs || 3000);
    }
  }, [styleConfig.controlsAutoHide, styleConfig.controlsAutoHideMs]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ backgroundColor: styleConfig.backgroundColor, borderRadius: `${styleConfig.borderRadius}px`, aspectRatio: "16/9" }}
      onMouseMove={showControlsTemporarily}
      onMouseEnter={showControlsTemporarily}
    >
      {/* Real video element */}
      {videoUrl ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          poster={posterUrl}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          playsInline
          muted={muted}
        />
      ) : posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
      )}

      {/* Recovery Thumbnail overlay */}
      {showRecovery && recoveryThumbnailConfig.enabled && recoveryThumbnailConfig.imageUrl && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center cursor-pointer"
          onClick={() => { setShowRecovery(false); videoRef.current?.play(); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={recoveryThumbnailConfig.imageUrl} alt="Recovery" className="absolute inset-0 w-full h-full object-cover" />
          {recoveryThumbnailConfig.message && (
            <div className="relative z-10 bg-black/60 px-6 py-3 rounded-xl text-white text-sm font-medium">
              {recoveryThumbnailConfig.message}
            </div>
          )}
        </div>
      )}

      {/* Autoplay overlay */}
      {showAutoplayOverlay && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer"
          style={{ backgroundColor: `rgba(0,0,0,${autoplayConfig.overlayOpacity || 0.85})` }}
          onClick={handleUnmute}
        >
          <div
            className="w-16 h-16 rounded-full border-2 flex items-center justify-center mb-3"
            style={{ borderColor: styleConfig.primaryColor }}
          >
            <Volume2 className="w-7 h-7" style={{ color: styleConfig.primaryColor }} />
          </div>
          <p className="text-white text-sm font-medium mb-1 text-center px-4">
            {autoplayConfig.mutedMessage || "Your video has already started"}
          </p>
          <p className="text-sm font-semibold" style={{ color: styleConfig.primaryColor }}>
            {autoplayConfig.clickMessage || "Click to listen"}
          </p>
        </div>
      )}

      {/* Big play button (no autoplay, paused) */}
      {!showAutoplayOverlay && !playing && styleConfig.showBigPlayButton && (
        <div className="absolute inset-0 z-10 flex items-center justify-center" onClick={togglePlayPause}>
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: styleConfig.primaryColor }}
          >
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Controls bar */}
      {styleConfig.showControls && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-300"
          style={{ opacity: controlsVisible || !styleConfig.controlsAutoHide ? 1 : 0 }}
        >
          {/* Progress bar */}
          {styleConfig.showProgressBar && (
            <div className="px-3 pb-1 pt-2">
              <div
                className="h-1.5 rounded-full bg-white/20 relative cursor-pointer group"
                onClick={handleSeek}
              >
                <div
                  className="h-full rounded-full transition-none"
                  style={{ width: `${progress}%`, backgroundColor: styleConfig.primaryColor }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${progress}%`, marginLeft: "-7px", backgroundColor: styleConfig.primaryColor }}
                />
              </div>
            </div>
          )}

          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ backgroundColor: styleConfig.controlsBackground, color: styleConfig.controlsColor }}
          >
            {/* Left side */}
            <div className="flex items-center gap-2">
              {styleConfig.showRewind && (
                <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }}>
                  <SkipBack className="w-4 h-4 hover:opacity-70 transition-opacity" />
                </button>
              )}
              {styleConfig.showSmallPlayButton && (
                <button onClick={togglePlayPause}>
                  {playing
                    ? <Pause className="w-4 h-4 hover:opacity-70 transition-opacity" fill="currentColor" />
                    : <Play className="w-4 h-4 hover:opacity-70 transition-opacity" fill="currentColor" />
                  }
                </button>
              )}
              {styleConfig.showFastForward && (
                <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }}>
                  <SkipForward className="w-4 h-4 hover:opacity-70 transition-opacity" />
                </button>
              )}
              {styleConfig.showVideoTimer && (
                <span className="text-xs font-mono whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              )}
            </div>

            <div className="flex-1" />

            {/* Right side */}
            <div className="flex items-center gap-2">
              {styleConfig.showSpeedControl && (
                <span className="text-xs font-medium cursor-pointer hover:opacity-70">1x</span>
              )}
              {styleConfig.showVolume && (
                <div className="flex items-center gap-1 group/vol">
                  <button onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    const newMuted = !v.muted;
                    v.muted = newMuted;
                    setMuted(newMuted);
                  }}>
                    <VolumeIcon className="w-4 h-4 hover:opacity-70 transition-opacity" />
                  </button>
                  <input
                    type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-0 group-hover/vol:w-16 overflow-hidden transition-all duration-200 accent-current cursor-pointer"
                    style={{ accentColor: styleConfig.primaryColor }}
                  />
                </div>
              )}
              {styleConfig.showFullscreen && (
                <button onClick={() => videoRef.current?.requestFullscreen?.()}>
                  <Maximize className="w-4 h-4 hover:opacity-70 transition-opacity" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PlayerConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
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
    primaryColor: "#10b981",
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
      if (v) {
        setVideoUrl(v.hlsUrl || v.hls_url || "");
        setPosterUrl(v.posterUrl || v.poster_url || "");
      }
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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Player Settings</h1>
          <p className="text-muted-foreground">Configure the player appearance and behavior.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            : saved ? <Check className="w-4 h-4 mr-2" />
            : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Split layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">

        {/* ── LEFT: Settings panels ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* APPEARANCE */}
          <Card>
            <CardTitle className="mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Appearance
            </CardTitle>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={styleConfig.primaryColor}
                      onChange={(e) => setStyleConfig((c) => ({ ...c, primaryColor: e.target.value }))}
                      className="w-10 h-10 rounded border border-border cursor-pointer"
                    />
                    <Input value={styleConfig.primaryColor} onChange={(e) => setStyleConfig((c) => ({ ...c, primaryColor: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Controls Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={styleConfig.controlsColor}
                      onChange={(e) => setStyleConfig((c) => ({ ...c, controlsColor: e.target.value }))}
                      className="w-10 h-10 rounded border border-border cursor-pointer"
                    />
                    <Input value={styleConfig.controlsColor} onChange={(e) => setStyleConfig((c) => ({ ...c, controlsColor: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Background Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={styleConfig.backgroundColor}
                      onChange={(e) => setStyleConfig((c) => ({ ...c, backgroundColor: e.target.value }))}
                      className="w-10 h-10 rounded border border-border cursor-pointer"
                    />
                    <Input value={styleConfig.backgroundColor} onChange={(e) => setStyleConfig((c) => ({ ...c, backgroundColor: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Border Radius</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min="0" max="24"
                      value={styleConfig.borderRadius}
                      onChange={(e) => setStyleConfig((c) => ({ ...c, borderRadius: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-10">{styleConfig.borderRadius}px</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Controls Bar Background</label>
                  <select
                    value={styleConfig.controlsBackground}
                    onChange={(e) => setStyleConfig((c) => ({ ...c, controlsBackground: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  >
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

          {/* CONTROLS */}
          <Card>
            <CardTitle className="mb-4">Controls Visibility</CardTitle>
            <CardContent>
              <FeatureToggle
                label="Show Controls Bar"
                description="Display the controls bar at the bottom of the player"
                enabled={styleConfig.showControls}
                onToggle={(v) => setStyleConfig((c) => ({ ...c, showControls: v }))}
              />
              {styleConfig.showControls && (
                <>
                  <FeatureToggle label="Progress Bar" description="Seekable timeline bar" enabled={styleConfig.showProgressBar} onToggle={(v) => setStyleConfig((c) => ({ ...c, showProgressBar: v }))} />
                  <FeatureToggle label="Play/Pause Button" description="Small play/pause in controls bar" enabled={styleConfig.showSmallPlayButton} onToggle={(v) => setStyleConfig((c) => ({ ...c, showSmallPlayButton: v }))} />
                  <FeatureToggle label="Video Timer" description="Show current time / total duration" enabled={styleConfig.showVideoTimer} onToggle={(v) => setStyleConfig((c) => ({ ...c, showVideoTimer: v }))} />
                  <FeatureToggle label="Volume" description="Volume control icon" enabled={styleConfig.showVolume} onToggle={(v) => setStyleConfig((c) => ({ ...c, showVolume: v }))} />
                  <FeatureToggle label="Fullscreen" description="Fullscreen toggle button" enabled={styleConfig.showFullscreen} onToggle={(v) => setStyleConfig((c) => ({ ...c, showFullscreen: v }))} />
                  <FeatureToggle label="Rewind (10s)" description="Skip back 10 seconds" enabled={styleConfig.showRewind} onToggle={(v) => setStyleConfig((c) => ({ ...c, showRewind: v }))} />
                  <FeatureToggle label="Fast Forward (10s)" description="Skip ahead 10 seconds" enabled={styleConfig.showFastForward} onToggle={(v) => setStyleConfig((c) => ({ ...c, showFastForward: v }))} />
                  <FeatureToggle label="Speed Control" description="Playback speed selector (1x, 1.5x, 2x)" enabled={styleConfig.showSpeedControl} onToggle={(v) => setStyleConfig((c) => ({ ...c, showSpeedControl: v }))} />
                  <FeatureToggle label="Big Play Button" description="Large centered play button on the video" enabled={styleConfig.showBigPlayButton} onToggle={(v) => setStyleConfig((c) => ({ ...c, showBigPlayButton: v }))} />
                  <FeatureToggle label="Auto-hide Controls" description="Controls disappear after a few seconds of inactivity" enabled={styleConfig.controlsAutoHide} onToggle={(v) => setStyleConfig((c) => ({ ...c, controlsAutoHide: v }))} />
                </>
              )}
            </CardContent>
          </Card>

          {/* SMART AUTOPLAY */}
          <Card>
            <CardTitle className="mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" /> Smart Autoplay
            </CardTitle>
            <CardContent>
              <FeatureToggle
                label="Enable Smart Autoplay"
                description="Video starts muted with an overlay prompting viewers to click to listen"
                enabled={autoplayConfig.enabled}
                onToggle={(v) => setAutoplayConfig((c: any) => ({ ...c, enabled: v }))}
              />
              {autoplayConfig.enabled && (
                <>
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
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-1.5 block">Overlay Opacity</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min="0.3" max="1" step="0.05"
                        value={autoplayConfig.overlayOpacity}
                        onChange={(e) => setAutoplayConfig((c: any) => ({ ...c, overlayOpacity: parseFloat(e.target.value) }))}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-10">{Math.round((autoplayConfig.overlayOpacity || 0.85) * 100)}%</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* FICTITIOUS PROGRESS */}
          <Card>
            <CardTitle className="mb-4 flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary" /> Fictitious Progress Bar
            </CardTitle>
            <CardContent>
              <FeatureToggle
                label="Enable Fictitious Progress"
                description="Progress bar moves faster at start — makes videos feel shorter, improves retention"
                enabled={progressBarConfig.fictitious}
                onToggle={(v) => setProgressBarConfig((c: any) => ({ ...c, fictitious: v }))}
              />
              {progressBarConfig.fictitious && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Fast Phase End</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min="0.05" max="0.4" step="0.05" value={progressBarConfig.fastPhaseEnd}
                        onChange={(e) => setProgressBarConfig((c: any) => ({ ...c, fastPhaseEnd: parseFloat(e.target.value) }))} className="flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{Math.round((progressBarConfig.fastPhaseEnd || 0.2) * 100)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">First N% of video plays in "fast" mode</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Slow Phase End</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min="0.5" max="0.95" step="0.05" value={progressBarConfig.slowPhaseEnd}
                        onChange={(e) => setProgressBarConfig((c: any) => ({ ...c, slowPhaseEnd: parseFloat(e.target.value) }))} className="flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{Math.round((progressBarConfig.slowPhaseEnd || 0.8) * 100)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Progress slows down through the middle</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ENGAGEMENT */}
          <Card>
            <CardTitle className="mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Engagement Features
            </CardTitle>
            <CardContent>
              <FeatureToggle
                label="Recovery Thumbnail"
                description="Show a re-engagement image when the video is paused after 2 seconds"
                enabled={recoveryThumbnailConfig.enabled}
                onToggle={(v) => setRecoveryThumbnailConfig((c: any) => ({ ...c, enabled: v }))}
                icon={<Eye className="w-4 h-4" />}
              />
              {recoveryThumbnailConfig.enabled && (
                <div className="grid grid-cols-2 gap-4 mt-4 mb-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Image URL</label>
                    <Input
                      placeholder="https://example.com/thumb.jpg"
                      value={recoveryThumbnailConfig.imageUrl}
                      onChange={(e) => setRecoveryThumbnailConfig((c: any) => ({ ...c, imageUrl: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Message (optional)</label>
                    <Input
                      placeholder="Continue watching?"
                      value={recoveryThumbnailConfig.message}
                      onChange={(e) => setRecoveryThumbnailConfig((c: any) => ({ ...c, message: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              <FeatureToggle
                label="Resume Play"
                description="Returning visitors continue where they left off"
                enabled={resumePlayConfig.enabled}
                onToggle={(v) => setResumePlayConfig((c: any) => ({ ...c, enabled: v }))}
                icon={<Pause className="w-4 h-4" />}
              />
              <FeatureToggle
                label="Mini-Hook"
                description="Short text notifications at 25%, 50%, 75% to maintain attention"
                enabled={miniHookConfig.enabled}
                onToggle={(v) => setMiniHookConfig((c: any) => ({ ...c, enabled: v }))}
                icon={<MousePointer className="w-4 h-4" />}
              />
              <FeatureToggle
                label="Turbo Speed"
                description="Slightly speed up playback (A/B test 0.95x–1.15x) for better completion rates"
                enabled={turboSpeedConfig.enabled}
                onToggle={(v) => setTurboSpeedConfig((c: any) => ({ ...c, enabled: v }))}
                icon={<Gauge className="w-4 h-4" />}
              />
              <FeatureToggle
                label="Analytics"
                description="Track all viewer events — plays, pauses, CTA clicks, watch time"
                enabled={analyticsEnabled}
                onToggle={setAnalyticsEnabled}
              />
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Sticky live player ─────────────────────────────────────── */}
        <div className="xl:sticky xl:top-6">
          <Card className="overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Preview</span>
              <span className="text-xs text-muted-foreground">Changes apply instantly</span>
            </div>
            <div className="p-3">
              <LivePlayerPreview
                videoUrl={videoUrl}
                posterUrl={posterUrl}
                autoplayConfig={autoplayConfig}
                progressBarConfig={progressBarConfig}
                recoveryThumbnailConfig={recoveryThumbnailConfig}
                styleConfig={styleConfig}
              />
            </div>
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <div className="flex flex-wrap gap-2">
                {autoplayConfig.enabled && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Smart Autoplay</span>
                )}
                {progressBarConfig.fictitious && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">Fictitious Progress</span>
                )}
                {resumePlayConfig.enabled && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-violet-500/10 text-violet-400 border-violet-500/20">Resume Play</span>
                )}
                {recoveryThumbnailConfig.enabled && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/20">Recovery Thumb</span>
                )}
                {turboSpeedConfig.enabled && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Turbo Speed</span>
                )}
                {analyticsEnabled && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-slate-500/10 text-slate-400 border-slate-500/20">Analytics</span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
