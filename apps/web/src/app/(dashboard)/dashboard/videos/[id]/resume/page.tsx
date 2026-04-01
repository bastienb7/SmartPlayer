"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw, Save, Loader2, Check, AlertCircle } from "lucide-react";
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

interface ResumePlayConfig {
  enabled: boolean;
  maxAgeDays: number;
  promptMessage: string;
}

const defaultConfig: ResumePlayConfig = {
  enabled: true,
  maxAgeDays: 7,
  promptMessage: "Continue where you left off?",
};

export default function ResumePlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [config, setConfig] = useState<ResumePlayConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof ResumePlayConfig, value: any) =>
    setConfig((c) => ({ ...c, [key]: value }));

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        const r = player.resumePlayConfig;
        if (r && typeof r === "object" && Object.keys(r).length > 0) {
          setConfig({
            enabled: r.enabled ?? defaultConfig.enabled,
            maxAgeDays: r.maxAgeDays ?? defaultConfig.maxAgeDays,
            promptMessage: r.promptMessage ?? defaultConfig.promptMessage,
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
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-primary" /> Resume Play
          </h1>
          <p className="text-muted-foreground">
            Allow viewers to continue watching from where they left off.
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
          label="Enable Resume Play"
          description="Viewers can pick up where they left off on return visits"
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
                <div className="h-full w-[42%] bg-primary" />
              </div>
              {/* Play icon hint */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-white/60 ml-1" />
                </div>
              </div>
              {/* Resume overlay */}
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                <p className="text-white text-sm font-medium text-center px-4">
                  {config.promptMessage || "Continue where you left off?"}
                </p>
                <div className="flex gap-2">
                  <span className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                    Resume
                  </span>
                  <span className="px-4 py-1.5 rounded-md bg-white/10 text-white text-xs font-medium border border-white/20">
                    Start Over
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {config.enabled && (
        <Card>
          <CardTitle className="mb-4">Settings</CardTitle>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Max Age (days)</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={config.maxAgeDays}
                  onChange={(e) => update("maxAgeDays", parseInt(e.target.value) || 7)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Resume position expires after this many days of inactivity.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Prompt Message</label>
                <Input
                  value={config.promptMessage}
                  onChange={(e) => update("promptMessage", e.target.value)}
                  placeholder="Continue where you left off?"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Message shown to returning viewers before resuming playback.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
