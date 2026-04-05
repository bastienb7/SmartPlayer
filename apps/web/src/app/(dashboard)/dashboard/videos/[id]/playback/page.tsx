"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sliders, Save, Loader2, Check, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";

interface ToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

function FeatureToggle({ label, description, enabled, onToggle }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button onClick={() => onToggle(!enabled)} className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

interface PlaybackConfig {
  allowSeek: boolean;
  allowSpeedChange: boolean;
  defaultSpeed: number;
  allowQualityChange: boolean;
  defaultQuality: string;
  loopVideo: boolean;
  muteOnStart: boolean;
  showRemainingTime: boolean;
  keyboardShortcuts: boolean;
  preloadStrategy: string;
}

const defaultConfig: PlaybackConfig = {
  allowSeek: true,
  allowSpeedChange: true,
  defaultSpeed: 1,
  allowQualityChange: true,
  defaultQuality: "auto",
  loopVideo: false,
  muteOnStart: false,
  showRemainingTime: false,
  keyboardShortcuts: true,
  preloadStrategy: "auto",
};

export default function PlaybackOptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [config, setConfig] = useState<PlaybackConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string, value: any) => setConfig((c) => ({ ...c, [key]: value }));

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        const p = player.playbackConfig;
        if (p && typeof p === "object" && Object.keys(p).length > 0) {
          setConfig({ ...defaultConfig, ...p });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await api.updatePlayerConfig(id, { playbackConfig: config });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sliders className="w-6 h-6 text-primary" /> Playback Options
          </h1>
          <p className="text-muted-foreground">Control how viewers interact with your video playback.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Saved!" : "Save"}
        </Button>
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6"><AlertCircle className="w-4 h-4" /> {error}</div>}

      <Card className="mb-6">
        <CardTitle className="mb-4">Navigation Controls</CardTitle>
        <CardContent>
          <FeatureToggle label="Allow Seeking" description="Let viewers scrub through the video timeline. Disable to force linear watching." enabled={config.allowSeek} onToggle={(v) => update("allowSeek", v)} />
          <FeatureToggle label="Keyboard Shortcuts" description="Enable space (play/pause), arrows (seek), M (mute), F (fullscreen)" enabled={config.keyboardShortcuts} onToggle={(v) => update("keyboardShortcuts", v)} />
          <FeatureToggle label="Loop Video" description="Restart the video automatically when it ends" enabled={config.loopVideo} onToggle={(v) => update("loopVideo", v)} />
          <FeatureToggle label="Show Remaining Time" description="Display countdown instead of elapsed time in the controls" enabled={config.showRemainingTime} onToggle={(v) => update("showRemainingTime", v)} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardTitle className="mb-4">Playback Speed</CardTitle>
        <CardContent>
          <FeatureToggle label="Allow Speed Change" description="Let viewers change playback speed (0.5x to 2x)" enabled={config.allowSpeedChange} onToggle={(v) => update("allowSpeedChange", v)} />
          <div className="mt-4">
            <label className="text-sm font-medium mb-1.5 block">Default Speed</label>
            <div className="flex items-center gap-3">
              {[0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                <button key={s} onClick={() => update("defaultSpeed", s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${config.defaultSpeed === s ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardTitle className="mb-4">Video Quality</CardTitle>
        <CardContent>
          <FeatureToggle label="Allow Quality Change" description="Let viewers manually switch between quality levels (360p, 720p, 1080p)" enabled={config.allowQualityChange} onToggle={(v) => update("allowQualityChange", v)} />
          <div className="mt-4">
            <label className="text-sm font-medium mb-1.5 block">Default Quality</label>
            <select value={config.defaultQuality} onChange={(e) => update("defaultQuality", e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="auto">Auto (adaptive bitrate)</option>
              <option value="360p">360p (save bandwidth)</option>
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p (best quality)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">Auto adapts to the viewer&apos;s internet speed.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardTitle className="mb-4">Loading &amp; Start</CardTitle>
        <CardContent>
          <FeatureToggle label="Mute on Start" description="Start the video muted (useful with autoplay)" enabled={config.muteOnStart} onToggle={(v) => update("muteOnStart", v)} />
          <div className="mt-4">
            <label className="text-sm font-medium mb-1.5 block">Preload Strategy</label>
            <select value={config.preloadStrategy} onChange={(e) => update("preloadStrategy", e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="auto">Auto — browser decides</option>
              <option value="metadata">Metadata only — loads fast, plays on click</option>
              <option value="none">None — nothing loads until play</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
