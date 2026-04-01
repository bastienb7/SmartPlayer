"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Play, Pause, Eye, Timer, MousePointer, Gauge, Loader2, Check, AlertCircle } from "lucide-react";
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
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? "translate-x-5" : ""}`}
        />
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

  const [autoplayConfig, setAutoplayConfig] = useState({
    enabled: true,
    mutedMessage: "Your video has already started",
    clickMessage: "Click to listen",
    overlayOpacity: 0.85,
  });

  const [progressBarConfig, setProgressBarConfig] = useState({
    enabled: true,
    fictitious: true,
    fastPhaseEnd: 0.2,
    slowPhaseEnd: 0.8,
    fastPhaseDisplay: 0.5,
    slowPhaseDisplay: 0.85,
  });

  const [recoveryThumbnailConfig, setRecoveryThumbnailConfig] = useState({
    enabled: false,
    imageUrl: "",
    delayMs: 2000,
    message: "",
  });

  const [resumePlayConfig, setResumePlayConfig] = useState({
    enabled: true,
    maxAgeDays: 7,
    promptMessage: "Continue where you left off?",
  });

  const [miniHookConfig, setMiniHookConfig] = useState({
    enabled: false,
    hooks: [] as Array<{ type: string; triggerAtPercent: number; text: string; durationMs: number }>,
  });

  const [turboSpeedConfig, setTurboSpeedConfig] = useState({
    enabled: false,
    minSpeed: 0.95,
    maxSpeed: 1.15,
  });

  const [styleConfig, setStyleConfig] = useState({
    primaryColor: "#6366f1",
    backgroundColor: "#000000",
    controlsBackground: "rgba(0,0,0,0.7)",
    controlsColor: "#ffffff",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    borderRadius: 8,
    showControls: true,
    controlsAutoHide: true,
    controlsAutoHideMs: 3000,
  });

  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        if (player.autoplayConfig) setAutoplayConfig(player.autoplayConfig);
        if (player.progressBarConfig) setProgressBarConfig(player.progressBarConfig);
        if (player.recoveryThumbnailConfig) setRecoveryThumbnailConfig(player.recoveryThumbnailConfig);
        if (player.resumePlayConfig) setResumePlayConfig(player.resumePlayConfig);
        if (player.miniHookConfig) setMiniHookConfig(player.miniHookConfig);
        if (player.turboSpeedConfig) setTurboSpeedConfig(player.turboSpeedConfig);
        if (player.styleConfig) setStyleConfig(player.styleConfig);
        if (player.analyticsEnabled !== undefined) setAnalyticsEnabled(player.analyticsEnabled);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api.updatePlayerConfig(id, {
        autoplayConfig,
        progressBarConfig,
        recoveryThumbnailConfig,
        resumePlayConfig,
        miniHookConfig,
        turboSpeedConfig,
        styleConfig,
        analyticsEnabled,
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
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Player Settings</h1>
          <p className="text-muted-foreground">Configure the player behavior for this video.</p>
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

      {/* Smart Autoplay */}
      <Card className="mb-6">
        <CardTitle className="mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" /> Smart Autoplay
        </CardTitle>
        <CardContent>
          <FeatureToggle
            label="Enable Smart Autoplay"
            description="Video starts playing muted with a persuasive overlay"
            enabled={autoplayConfig.enabled}
            onToggle={(v) => setAutoplayConfig((c) => ({ ...c, enabled: v }))}
          />
          {autoplayConfig.enabled && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Muted Message</label>
                <Input
                  value={autoplayConfig.mutedMessage}
                  onChange={(e) => setAutoplayConfig((c) => ({ ...c, mutedMessage: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Click Message</label>
                <Input
                  value={autoplayConfig.clickMessage}
                  onChange={(e) => setAutoplayConfig((c) => ({ ...c, clickMessage: e.target.value }))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fictitious Progress Bar */}
      <Card className="mb-6">
        <CardTitle className="mb-4 flex items-center gap-2">
          <Timer className="w-5 h-5 text-primary" /> Fictitious Progress Bar
        </CardTitle>
        <CardContent>
          <FeatureToggle
            label="Enable Fictitious Progress"
            description="Progress bar moves fast at start, making videos feel shorter"
            enabled={progressBarConfig.fictitious}
            onToggle={(v) => setProgressBarConfig((c) => ({ ...c, fictitious: v }))}
          />
          {progressBarConfig.fictitious && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Fast Phase End (0-1)</label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={progressBarConfig.fastPhaseEnd}
                  onChange={(e) => setProgressBarConfig((c) => ({ ...c, fastPhaseEnd: parseFloat(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Slow Phase End (0-1)</label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={progressBarConfig.slowPhaseEnd}
                  onChange={(e) => setProgressBarConfig((c) => ({ ...c, slowPhaseEnd: parseFloat(e.target.value) }))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Features */}
      <Card className="mb-6">
        <CardTitle className="mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" /> Engagement Features
        </CardTitle>
        <CardContent>
          <FeatureToggle
            label="Recovery Thumbnail"
            description="Show an image overlay when viewer pauses the video"
            enabled={recoveryThumbnailConfig.enabled}
            onToggle={(v) => setRecoveryThumbnailConfig((c) => ({ ...c, enabled: v }))}
            icon={<Eye className="w-4 h-4" />}
          />
          <FeatureToggle
            label="Resume Play"
            description="Allow viewers to continue from where they left off"
            enabled={resumePlayConfig.enabled}
            onToggle={(v) => setResumePlayConfig((c) => ({ ...c, enabled: v }))}
            icon={<Pause className="w-4 h-4" />}
          />
          <FeatureToggle
            label="Mini-Hook"
            description="Show engagement prompts at milestones (25%, 50%, 75%)"
            enabled={miniHookConfig.enabled}
            onToggle={(v) => setMiniHookConfig((c) => ({ ...c, enabled: v }))}
            icon={<MousePointer className="w-4 h-4" />}
          />
          <FeatureToggle
            label="Turbo Speed"
            description="A/B test playback speeds (0.95x-1.15x) to find best conversion rate"
            enabled={turboSpeedConfig.enabled}
            onToggle={(v) => setTurboSpeedConfig((c) => ({ ...c, enabled: v }))}
            icon={<Gauge className="w-4 h-4" />}
          />
          <FeatureToggle
            label="Analytics"
            description="Track video engagement events (plays, pauses, CTA clicks, etc.)"
            enabled={analyticsEnabled}
            onToggle={setAnalyticsEnabled}
          />
        </CardContent>
      </Card>

      {/* Style */}
      <Card>
        <CardTitle className="mb-4">Style</CardTitle>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={styleConfig.primaryColor}
                  onChange={(e) => setStyleConfig((c) => ({ ...c, primaryColor: e.target.value }))}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={styleConfig.primaryColor}
                  onChange={(e) => setStyleConfig((c) => ({ ...c, primaryColor: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Border Radius (px)</label>
              <Input
                type="number"
                value={styleConfig.borderRadius}
                onChange={(e) => setStyleConfig((c) => ({ ...c, borderRadius: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
