"use client";

import { use, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Play, Pause, Eye, Timer, MousePointer, Gauge } from "lucide-react";

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

  const [config, setConfig] = useState({
    autoplay: true,
    mutedMessage: "Your video has already started",
    clickMessage: "Click to listen",
    fictitious: true,
    fastPhaseEnd: 0.2,
    slowPhaseEnd: 0.8,
    recoveryThumbnail: false,
    recoveryDelay: 2000,
    resumePlay: true,
    miniHook: false,
    turboSpeed: false,
    primaryColor: "#6366f1",
    borderRadius: 8,
    controlsAutoHide: true,
  });

  const update = (key: string, value: any) => setConfig((c) => ({ ...c, [key]: value }));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Player Settings</h1>
          <p className="text-muted-foreground">Configure the player behavior for this video.</p>
        </div>
        <Button>
          <Save className="w-4 h-4 mr-2" /> Save Changes
        </Button>
      </div>

      {/* Smart Autoplay */}
      <Card className="mb-6">
        <CardTitle className="mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" /> Smart Autoplay
        </CardTitle>
        <CardContent>
          <FeatureToggle
            label="Enable Smart Autoplay"
            description="Video starts playing muted with a persuasive overlay"
            enabled={config.autoplay}
            onToggle={(v) => update("autoplay", v)}
          />
          {config.autoplay && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Muted Message</label>
                <Input
                  value={config.mutedMessage}
                  onChange={(e) => update("mutedMessage", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Click Message</label>
                <Input
                  value={config.clickMessage}
                  onChange={(e) => update("clickMessage", e.target.value)}
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
            enabled={config.fictitious}
            onToggle={(v) => update("fictitious", v)}
          />
          {config.fictitious && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Fast Phase End (0-1)</label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={config.fastPhaseEnd}
                  onChange={(e) => update("fastPhaseEnd", parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Slow Phase End (0-1)</label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={config.slowPhaseEnd}
                  onChange={(e) => update("slowPhaseEnd", parseFloat(e.target.value))}
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
            enabled={config.recoveryThumbnail}
            onToggle={(v) => update("recoveryThumbnail", v)}
            icon={<Eye className="w-4 h-4" />}
          />
          <FeatureToggle
            label="Resume Play"
            description="Allow viewers to continue from where they left off"
            enabled={config.resumePlay}
            onToggle={(v) => update("resumePlay", v)}
            icon={<Pause className="w-4 h-4" />}
          />
          <FeatureToggle
            label="Mini-Hook"
            description="Show engagement prompts at milestones (25%, 50%, 75%)"
            enabled={config.miniHook}
            onToggle={(v) => update("miniHook", v)}
            icon={<MousePointer className="w-4 h-4" />}
          />
          <FeatureToggle
            label="Turbo Speed"
            description="A/B test playback speeds (0.95x-1.15x) to find best conversion rate"
            enabled={config.turboSpeed}
            onToggle={(v) => update("turboSpeed", v)}
            icon={<Gauge className="w-4 h-4" />}
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
                  value={config.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={config.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Border Radius (px)</label>
              <Input
                type="number"
                value={config.borderRadius}
                onChange={(e) => update("borderRadius", parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
