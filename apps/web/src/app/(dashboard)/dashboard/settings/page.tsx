"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Settings, CreditCard, Globe, Save, Check, Loader2, AlertCircle, Copy,
  Key, Eye, EyeOff, RefreshCw, Building2, Code, Video, Layers,
  Zap, Crown, Rocket, Star,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    icon: <Zap className="w-5 h-5" />,
    color: "border-border",
    badge: "bg-slate-500/20 text-slate-400",
    features: ["3 videos", "1,000 plays/month", "Basic analytics", "Watermark"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    period: "/month",
    icon: <Star className="w-5 h-5" />,
    color: "border-blue-500/40",
    badge: "bg-blue-500/20 text-blue-400",
    features: ["25 videos", "25,000 plays/month", "Advanced analytics", "No watermark", "CTA buttons", "Headlines A/B"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$79",
    period: "/month",
    icon: <Crown className="w-5 h-5" />,
    color: "border-primary/40",
    badge: "bg-emerald-500/20 text-emerald-400",
    popular: true,
    features: ["Unlimited videos", "Unlimited plays", "Full analytics + heatmap", "All features", "Funnels", "Traffic filter", "Priority support"],
  },
  {
    id: "business",
    name: "Business",
    price: "$199",
    period: "/month",
    icon: <Rocket className="w-5 h-5" />,
    color: "border-violet-500/40",
    badge: "bg-violet-500/20 text-violet-400",
    features: ["Everything in Pro", "White-label player", "Custom domain", "API access", "Dedicated support", "SLA 99.9%"],
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Org name
  const [orgName, setOrgName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);

  // API key
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Copy helpers
  const [copiedField, setCopiedField] = useState("");

  useEffect(() => {
    api.getSettings()
      .then((data) => {
        setSettings(data);
        setOrgName(data.orgName || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      await api.updateSettings({ orgName });
      setSavedName(true);
      setTimeout(() => setSavedName(false), 2000);
    } catch (err: any) { setError(err.message); }
    finally { setSavingName(false); }
  };

  const handleRegenerateKey = async () => {
    if (!confirm("Regenerate API key? Existing integrations using the current key will stop working.")) return;
    setRegenerating(true);
    try {
      const data = await api.regenerateApiKey();
      setSettings({ ...settings, apiKey: data.apiKey });
    } catch (err: any) { setError(err.message); }
    finally { setRegenerating(false); }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

  const handleChangePlan = async (planId: string) => {
    if (planId === settings?.plan) return;
    if (planId === "free" && settings?.plan !== "free") {
      if (!confirm("Downgrade to Free? You'll lose access to premium features at the end of your billing period.")) return;
    }
    try {
      await api.updatePlan(planId);
      setSettings({ ...settings, plan: planId });
    } catch (err: any) { setError(err.message); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  const currentPlan = plans.find((p) => p.id === settings?.plan) || plans[0];
  const maskedKey = settings?.apiKey
    ? `${settings.apiKey.slice(0, 8)}${"•".repeat(32)}${settings.apiKey.slice(-6)}`
    : "No API key generated";

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your organization, billing, and integrations.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* ===== ORGANIZATION ===== */}
      <Card className="mb-6">
        <CardTitle className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary" /> Organization
        </CardTitle>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Organization Name</label>
              <div className="flex gap-2">
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                <Button variant="outline" onClick={handleSaveName} disabled={savingName}>
                  {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : savedName ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Account Email</label>
              <Input readOnly value={user?.email || ""} className="bg-muted" />
            </div>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Video className="w-4 h-4" /> {settings?.videoCount ?? 0} videos</span>
            <span className="flex items-center gap-1.5"><Layers className="w-4 h-4" /> {settings?.funnelCount ?? 0} funnels</span>
          </div>
        </CardContent>
      </Card>

      {/* ===== BILLING & PLAN ===== */}
      <Card className="mb-6">
        <CardTitle className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-primary" /> Billing & Plan
        </CardTitle>
        <CardContent>
          {/* Current plan banner */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentPlan.badge}`}>
                {currentPlan.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{currentPlan.name} Plan</span>
                  <Badge>Current</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{currentPlan.price}{currentPlan.period}</p>
              </div>
            </div>
            {settings?.plan !== "free" && (
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleChangePlan("free")}>
                Cancel subscription
              </Button>
            )}
          </div>

          {/* Plan grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {plans.map((plan) => {
              const isCurrent = plan.id === settings?.plan;
              const isUpgrade = plans.indexOf(plan) > plans.findIndex((p) => p.id === settings?.plan);
              return (
                <div key={plan.id} className={`rounded-xl border-2 p-4 transition-all ${isCurrent ? plan.color + " bg-primary/5" : "border-border hover:border-border"} ${plan.popular ? "relative" : ""}`}>
                  {plan.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] font-semibold bg-primary text-white px-2 py-0.5 rounded-full">Popular</span>
                    </div>
                  )}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${plan.badge}`}>
                    {plan.icon}
                  </div>
                  <h3 className="font-semibold text-sm">{plan.name}</h3>
                  <div className="flex items-baseline gap-0.5 mb-3">
                    <span className="text-2xl font-bold">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map((f) => (
                      <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Badge className="w-full justify-center">Current Plan</Badge>
                  ) : (
                    <Button
                      variant={isUpgrade ? "primary" : "outline"}
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => handleChangePlan(plan.id)}
                    >
                      {isUpgrade ? "Upgrade" : "Downgrade"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ===== API KEY ===== */}
      <Card className="mb-6">
        <CardTitle className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-primary" /> API Key
        </CardTitle>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Your API key authenticates requests to the SmartPlayer public API (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">/v1/*</code>). Never share it publicly.
          </p>
          <div className="flex gap-2 mb-3">
            <Input
              readOnly
              value={showKey ? (settings?.apiKey || "") : maskedKey}
              className="bg-muted font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)} title={showKey ? "Hide" : "Show"}>
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => { copyToClipboard(settings?.apiKey || "", "apiKey"); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }}>
              {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={handleRegenerateKey} disabled={regenerating} className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
              {regenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== INTEGRATION ===== */}
      <Card className="mb-6">
        <CardTitle className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-primary" /> Integration
        </CardTitle>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: "Base URL", value: settings?.baseUrl || "", field: "baseUrl" },
              { label: "Player Script", value: settings?.playerScriptUrl || "", field: "script" },
              { label: "Public API", value: `${settings?.baseUrl || ""}/v1`, field: "publicApi" },
              { label: "Analytics Endpoint", value: `${settings?.baseUrl || ""}/analytics/events`, field: "analytics" },
            ].map((item) => (
              <div key={item.field}>
                <label className="text-sm font-medium mb-1.5 block">{item.label}</label>
                <div className="flex gap-2">
                  <Input readOnly value={item.value} className="bg-muted font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(item.value, item.field)}>
                    {copiedField === item.field ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ===== EMBED TEMPLATE ===== */}
      <Card>
        <CardTitle className="flex items-center gap-2 mb-4">
          <Code className="w-5 h-5 text-primary" /> Embed Code Template
        </CardTitle>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto leading-relaxed">
{`<!-- Single Video -->
<div id="smartplayer-VIDEO_ID"
     data-api="${settings?.baseUrl || ""}"></div>
<script src="${settings?.playerScriptUrl || ""}"
        defer></script>

<!-- Video Funnel -->
<div id="smartplayer-funnel-FUNNEL_ID"></div>
<script src="${settings?.playerScriptUrl || ""}"
        data-funnel="FUNNEL_ID"
        data-api="${settings?.baseUrl || ""}"
        defer></script>`}
            </pre>
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-3 right-3"
              onClick={() => copyToClipboard(
                `<div id="smartplayer-VIDEO_ID" data-api="${settings?.baseUrl}"></div>\n<script src="${settings?.playerScriptUrl}" defer></script>`,
                "embed"
              )}
            >
              {copiedField === "embed" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Replace <code className="bg-muted px-1 py-0.5 rounded">VIDEO_ID</code> or <code className="bg-muted px-1 py-0.5 rounded">FUNNEL_ID</code> with the actual ID from your dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
