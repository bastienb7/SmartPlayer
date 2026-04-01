"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Filter, Save, Loader2, Check, AlertCircle, Globe, Monitor, Smartphone, Tablet,
  Shield, Bot, Key, Languages, MapPin, Wifi, Info, Video,
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

interface TrafficFilterConfig {
  enabled: boolean;
  // Language
  filterByLanguage: boolean;
  allowedLanguages: string[];
  // Country
  filterByCountry: boolean;
  allowedCountries: string[];
  // Device
  filterByDevice: boolean;
  allowDesktop: boolean;
  allowTablet: boolean;
  allowMobile: boolean;
  // URL Key
  filterByUrlKey: boolean;
  urlKeyParam: string;
  urlKeyValue: string;
  // VPN / Proxy
  blockVpnProxy: boolean;
  // Bot protection
  blockBots: boolean;
  // Redirect
  redirectVideoId: string;
  redirectUrl: string;
}

const defaultConfig: TrafficFilterConfig = {
  enabled: false,
  filterByLanguage: false,
  allowedLanguages: [],
  filterByCountry: false,
  allowedCountries: [],
  filterByDevice: false,
  allowDesktop: true,
  allowTablet: true,
  allowMobile: true,
  filterByUrlKey: false,
  urlKeyParam: "key",
  urlKeyValue: "",
  blockVpnProxy: false,
  blockBots: true,
  redirectVideoId: "",
  redirectUrl: "",
};

const commonLanguages = [
  { code: "fr", label: "French" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "tr", label: "Turkish" },
];

const commonCountries = [
  { code: "FR", label: "France" },
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "DE", label: "Germany" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "PT", label: "Portugal" },
  { code: "BR", label: "Brazil" },
  { code: "BE", label: "Belgium" },
  { code: "CH", label: "Switzerland" },
  { code: "NL", label: "Netherlands" },
  { code: "AU", label: "Australia" },
  { code: "JP", label: "Japan" },
  { code: "IN", label: "India" },
  { code: "MX", label: "Mexico" },
  { code: "MA", label: "Morocco" },
  { code: "DZ", label: "Algeria" },
  { code: "TN", label: "Tunisia" },
  { code: "SN", label: "Senegal" },
  { code: "CI", label: "Ivory Coast" },
];

export default function TrafficFilterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [config, setConfig] = useState<TrafficFilterConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string, value: any) => setConfig((c) => ({ ...c, [key]: value }));

  const toggleLanguage = (code: string) => {
    setConfig((c) => ({
      ...c,
      allowedLanguages: c.allowedLanguages.includes(code)
        ? c.allowedLanguages.filter((l) => l !== code)
        : [...c.allowedLanguages, code],
    }));
  };

  const toggleCountry = (code: string) => {
    setConfig((c) => ({
      ...c,
      allowedCountries: c.allowedCountries.includes(code)
        ? c.allowedCountries.filter((l) => l !== code)
        : [...c.allowedCountries, code],
    }));
  };

  useEffect(() => {
    api.getPlayerConfig(id)
      .then((player) => {
        const t = player.trafficFilterConfig;
        if (t && typeof t === "object" && Object.keys(t).length > 0) {
          setConfig({ ...defaultConfig, ...t });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await api.updatePlayerConfig(id, { trafficFilterConfig: config });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  // Count active filters
  const activeFilters = [
    config.filterByLanguage,
    config.filterByCountry,
    config.filterByDevice,
    config.filterByUrlKey,
    config.blockVpnProxy,
    config.blockBots,
  ].filter(Boolean).length;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Filter className="w-6 h-6 text-primary" /> Traffic Filter
          </h1>
          <p className="text-muted-foreground">
            Control who sees your video. Filter visitors by language, country, device, and more. Non-matching visitors see a redirect video or URL.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Saved!" : "Save"}
        </Button>
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6"><AlertCircle className="w-4 h-4" /> {error}</div>}

      {/* How it works */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardTitle className="flex items-center gap-2 mb-3 text-base">
          <Info className="w-5 h-5 text-primary" /> How It Works
        </CardTitle>
        <CardContent className="p-0 text-sm text-muted-foreground">
          <p className="mb-2">Visitors who match <strong className="text-foreground">all active filters</strong> see your main video. Everyone else is redirected to an alternative video or URL.</p>
          <p>Use this to protect your VSL from competitors, filter bots that inflate your ad costs, or target specific audiences (language, country, device).</p>
        </CardContent>
      </Card>

      {/* Enable */}
      <Card className="mb-6">
        <FeatureToggle
          label="Enable Traffic Filter"
          description={`${activeFilters} filter${activeFilters !== 1 ? "s" : ""} active`}
          enabled={config.enabled}
          onToggle={(v) => update("enabled", v)}
          icon={<Filter className="w-4 h-4" />}
        />
      </Card>

      {config.enabled && (
        <>
          {/* ===== BOT & VPN ===== */}
          <Card className="mb-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Security
            </CardTitle>
            <CardContent>
              <FeatureToggle
                label="Block Bots & Crawlers"
                description="Automatically detect bots, crawlers, and headless browsers. They see the redirect content instead of your real video — protects your VSL and keeps analytics clean."
                enabled={config.blockBots}
                onToggle={(v) => update("blockBots", v)}
                icon={<Bot className="w-4 h-4" />}
              />
              <FeatureToggle
                label="Block VPN & Proxy"
                description="Redirect visitors using VPN, proxy, or Tor connections. Useful to enforce geo-targeting and prevent competitors from viewing your page anonymously."
                enabled={config.blockVpnProxy}
                onToggle={(v) => update("blockVpnProxy", v)}
                icon={<Wifi className="w-4 h-4" />}
              />
            </CardContent>
          </Card>

          {/* ===== LANGUAGE ===== */}
          <Card className="mb-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Languages className="w-5 h-5 text-primary" /> Browser Language
            </CardTitle>
            <CardContent>
              <FeatureToggle
                label="Filter by Language"
                description="Only show your video to visitors whose browser is set to one of the selected languages."
                enabled={config.filterByLanguage}
                onToggle={(v) => update("filterByLanguage", v)}
              />
              {config.filterByLanguage && (
                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">Allowed Languages</label>
                  <div className="flex flex-wrap gap-2">
                    {commonLanguages.map((lang) => {
                      const active = config.allowedLanguages.includes(lang.code);
                      return (
                        <button
                          key={lang.code}
                          onClick={() => toggleLanguage(lang.code)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${active ? "bg-primary text-white border-primary" : "border-border bg-background hover:bg-muted"}`}
                        >
                          {lang.label}
                        </button>
                      );
                    })}
                  </div>
                  {config.allowedLanguages.length === 0 && (
                    <p className="text-xs text-amber-400 mt-2">Select at least one language, or all visitors will be redirected.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== COUNTRY ===== */}
          <Card className="mb-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Country (GeoIP)
            </CardTitle>
            <CardContent>
              <FeatureToggle
                label="Filter by Country"
                description="Only show your video to visitors from selected countries. Uses IP geolocation."
                enabled={config.filterByCountry}
                onToggle={(v) => update("filterByCountry", v)}
              />
              {config.filterByCountry && (
                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">Allowed Countries</label>
                  <div className="flex flex-wrap gap-2">
                    {commonCountries.map((country) => {
                      const active = config.allowedCountries.includes(country.code);
                      return (
                        <button
                          key={country.code}
                          onClick={() => toggleCountry(country.code)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${active ? "bg-primary text-white border-primary" : "border-border bg-background hover:bg-muted"}`}
                        >
                          {country.label}
                        </button>
                      );
                    })}
                  </div>
                  {config.allowedCountries.length === 0 && (
                    <p className="text-xs text-amber-400 mt-2">Select at least one country, or all visitors will be redirected.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== DEVICE ===== */}
          <Card className="mb-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" /> Device Type
            </CardTitle>
            <CardContent>
              <FeatureToggle
                label="Filter by Device"
                description="Choose which device types can see your video."
                enabled={config.filterByDevice}
                onToggle={(v) => update("filterByDevice", v)}
              />
              {config.filterByDevice && (
                <div className="mt-4 flex gap-3">
                  {[
                    { key: "allowDesktop", label: "Desktop", icon: <Monitor className="w-5 h-5" /> },
                    { key: "allowTablet", label: "Tablet", icon: <Tablet className="w-5 h-5" /> },
                    { key: "allowMobile", label: "Mobile", icon: <Smartphone className="w-5 h-5" /> },
                  ].map((d) => {
                    const active = config[d.key as keyof TrafficFilterConfig] as boolean;
                    return (
                      <button
                        key={d.key}
                        onClick={() => update(d.key, !active)}
                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${active ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                      >
                        {d.icon}
                        <span className="text-xs font-medium">{d.label}</span>
                        <Badge variant={active ? "success" : "error"}>{active ? "Allowed" : "Blocked"}</Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== URL KEY ===== */}
          <Card className="mb-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> URL Key (Secret Link)
            </CardTitle>
            <CardContent>
              <FeatureToggle
                label="Require URL Parameter"
                description="Only visitors with a specific parameter in the URL can see the video. Example: yourpage.com?key=secret123"
                enabled={config.filterByUrlKey}
                onToggle={(v) => update("filterByUrlKey", v)}
              />
              {config.filterByUrlKey && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Parameter Name</label>
                    <Input value={config.urlKeyParam} onChange={(e) => update("urlKeyParam", e.target.value)} placeholder="key" className="font-mono" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Expected Value</label>
                    <Input value={config.urlKeyValue} onChange={(e) => update("urlKeyValue", e.target.value)} placeholder="secret123" className="font-mono" />
                  </div>
                  {config.urlKeyParam && config.urlKeyValue && (
                    <div className="col-span-2 bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Only this URL will show the video:</p>
                      <code className="text-xs text-primary font-mono">yourpage.com?{config.urlKeyParam}={config.urlKeyValue}</code>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== REDIRECT ===== */}
          <Card>
            <CardTitle className="mb-4 flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" /> Redirect Content
            </CardTitle>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                When a visitor doesn&apos;t match the filter criteria, show them alternative content instead. This can be a different video or a redirect URL.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Redirect Video ID (optional)</label>
                  <Input value={config.redirectVideoId} onChange={(e) => update("redirectVideoId", e.target.value)} placeholder="Paste another video's ID here" className="font-mono" />
                  <p className="text-xs text-muted-foreground mt-1">The filtered visitor will see this video instead of your main one.</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Or Redirect URL</label>
                  <Input value={config.redirectUrl} onChange={(e) => update("redirectUrl", e.target.value)} placeholder="https://example.com/other-page" />
                  <p className="text-xs text-muted-foreground mt-1">Redirect to a completely different page instead.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
