"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Timer, Save, Loader2, Check, AlertCircle } from "lucide-react";
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
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

interface CountdownConfig {
  enabled: boolean;
  type: string;
  duration: number;
  text: string;
  showAt: number;
}

const countdownTypes = [
  { value: "realtime", label: "Real-Time", description: "Counts down in real time from a fixed date" },
  { value: "session", label: "Session", description: "Resets each session; creates urgency per visit" },
  { value: "evergreen", label: "Evergreen", description: "Starts fresh for each unique viewer" },
];

const defaultConfig: CountdownConfig = {
  enabled: false,
  type: "evergreen",
  duration: 900,
  text: "Offer expires in",
  showAt: 0,
};

export default function CountdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [config, setConfig] = useState<CountdownConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof CountdownConfig, value: any) =>
    setConfig((c) => ({ ...c, [key]: value }));

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        const c = player.countdownConfig;
        if (c && typeof c === "object" && Object.keys(c).length > 0) {
          setConfig({
            enabled: c.enabled ?? defaultConfig.enabled,
            type: c.type ?? defaultConfig.type,
            duration: c.duration ?? defaultConfig.duration,
            text: c.text ?? defaultConfig.text,
            showAt: c.showAt ?? defaultConfig.showAt,
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api.updatePlayerConfig(id, { countdownConfig: config });
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Timer className="w-6 h-6 text-primary" /> Countdown Timer
          </h1>
          <p className="text-muted-foreground">
            Display a countdown timer to create urgency and drive conversions.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Saved!" : "Save"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Enable toggle */}
      <Card className="mb-6">
        <FeatureToggle
          label="Enable Countdown Timer"
          description="Show a countdown timer alongside the video player"
          enabled={config.enabled}
          onToggle={(v) => update("enabled", v)}
        />
      </Card>

      {/* Preview */}
      {config.enabled && (
        <Card className="mb-6">
          <CardTitle className="mb-4">Preview</CardTitle>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="relative bg-black rounded-lg aspect-video overflow-hidden">
              {/* Fake progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div className="h-full w-[60%] bg-primary" />
              </div>
              {/* Play icon hint */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-white/60 ml-1" />
                </div>
              </div>
              {/* Countdown overlay badge */}
              <div className="absolute top-4 right-4">
                <div className="bg-black/70 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 flex items-center gap-2">
                  <span className="text-white/80 text-xs font-medium">
                    {config.text || "Offer expires in"}
                  </span>
                  <span className="text-white text-sm font-bold font-mono">
                    {Math.floor(config.duration / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(config.duration % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {config.enabled && (
        <>
          {/* Countdown Type */}
          <Card className="mb-6">
            <CardTitle className="mb-4">Countdown Type</CardTitle>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {countdownTypes.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => update("type", ct.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      config.type === ct.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="font-medium text-sm">{ct.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{ct.description}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardTitle className="mb-4">Settings</CardTitle>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Display Text</label>
                  <Input
                    value={config.text}
                    onChange={(e) => update("text", e.target.value)}
                    placeholder="Offer expires in"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Text shown above the countdown timer.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Duration (seconds)</label>
                    <Input
                      type="number"
                      min={1}
                      value={config.duration}
                      onChange={(e) => update("duration", parseInt(e.target.value) || 900)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Total countdown duration in seconds.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Show At (seconds)</label>
                    <Input
                      type="number"
                      min={0}
                      value={config.showAt}
                      onChange={(e) => update("showAt", parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Timestamp in the video when the countdown appears. 0 = from start.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
