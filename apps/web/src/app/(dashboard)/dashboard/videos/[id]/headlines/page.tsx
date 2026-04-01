"use client";

import { use, useEffect, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, Image, Type, Play, Trophy, Beaker, BarChart3, Smartphone, Monitor,
  Loader2, AlertCircle, Save, Check,
} from "lucide-react";
import { api } from "@/lib/api-client";

type VariantType = "text" | "image" | "gif";

const googleFonts = [
  "Inter", "Roboto", "Open Sans", "Montserrat", "Lato", "Poppins", "Raleway",
  "Oswald", "Playfair Display", "Merriweather", "Nunito", "Ubuntu", "Rubik",
  "Work Sans", "DM Sans", "Manrope", "Plus Jakarta Sans", "Space Grotesk",
  "Outfit", "Sora", "Bebas Neue", "Archivo", "Barlow", "Cabin", "Comfortaa",
  "Crimson Text", "Dancing Script", "Exo 2", "Fira Sans", "Heebo",
  "IBM Plex Sans", "Josefin Sans", "Kanit", "Lexend", "Libre Baskerville",
  "Mulish", "Noto Sans", "PT Sans", "Quicksand", "Righteous",
  "Source Sans 3", "Titillium Web", "Urbanist", "Varela Round", "Vollkorn",
  "Yanone Kaffeesatz", "Zilla Slab", "Anton", "Archivo Black", "Bangers",
  "Caveat", "Courgette", "Fredoka", "Gloria Hallelujah", "Great Vibes",
  "Inconsolata", "Indie Flower", "Lobster", "Pacifico", "Permanent Marker",
  "Press Start 2P", "Sacramento", "Satisfy", "Shadows Into Light", "Special Elite",
];

const loadedFonts = new Set<string>();
function loadGoogleFont(fontFamily: string) {
  if (!fontFamily || fontFamily === "sans-serif" || loadedFonts.has(fontFamily)) return;
  loadedFonts.add(fontFamily);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

interface Variant {
  id: string;
  type: VariantType;
  text?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  altText?: string;
  style?: {
    fontSize?: string;
    fontWeight?: string;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: string;
    padding?: string;
  };
  weight: number;
  impressions: number;
  plays: number;
  conversions: number;
  conversionRate: number;
  isWinner: boolean;
  isEliminated: boolean;
}

interface HeadlinesConfig {
  position: string;
  animation: string;
  abTestEnabled: boolean;
  abTestStatus: string;
  includeNoHeadlineVariant: boolean;
  paddingTop: number;
  paddingBottom: number;
  containerBg: string;
  variants: Variant[];
}

const defaultConfig: HeadlinesConfig = {
  position: "above",
  animation: "fade",
  abTestEnabled: false,
  abTestStatus: "idle",
  includeNoHeadlineVariant: false,
  paddingTop: 16,
  paddingBottom: 16,
  containerBg: "transparent",
  variants: [],
};

export default function HeadlinesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [config, setConfig] = useState<HeadlinesConfig>(defaultConfig);
  const [posterUrl, setPosterUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

  useEffect(() => {
    Promise.all([
      api.getPlayerConfig(id),
      api.getVideo(id).catch(() => null),
    ]).then(([player, videoData]) => {
      const h = player.headlinesConfig;
      if (h && typeof h === "object" && Object.keys(h).length > 0) {
        setConfig({
          position: h.position || "above",
          animation: h.animation || "fade",
          abTestEnabled: h.abTestEnabled ?? false,
          abTestStatus: h.abTestStatus || "idle",
          includeNoHeadlineVariant: h.includeNoHeadlineVariant ?? false,
          paddingTop: h.paddingTop ?? 16,
          paddingBottom: h.paddingBottom ?? 16,
          containerBg: h.containerBg || "transparent",
          variants: (h.variants || []).map((v: any, i: number) => ({
            id: v.id || `v-${i}`, type: v.type || "text", text: v.text,
            imageUrl: v.imageUrl, mobileImageUrl: v.mobileImageUrl, altText: v.altText,
            style: v.style || {}, weight: v.weight ?? 100,
            impressions: v.impressions ?? 0, plays: v.plays ?? 0,
            conversions: v.conversions ?? 0, conversionRate: v.conversionRate ?? 0,
            isWinner: v.isWinner ?? false, isEliminated: v.isEliminated ?? false,
          })),
        });
      }
      const v = videoData?.video || videoData;
      if (v) setPosterUrl(v.posterUrl || v.poster_url || "");
    })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const addVariant = (type: VariantType) => {
    setConfig((c) => ({
      ...c,
      variants: [...c.variants, {
        id: `v-${Date.now()}`, type,
        text: type === "text" ? "Your compelling headline here" : undefined,
        imageUrl: type !== "text" ? "" : undefined,
        style: type === "text" ? { fontSize: "28px", fontWeight: "700", fontFamily: "sans-serif", color: "#ffffff", backgroundColor: "transparent", textAlign: "center", padding: "12px 16px" } : undefined,
        weight: 100, impressions: 0, plays: 0, conversions: 0, conversionRate: 0, isWinner: false, isEliminated: false,
      }],
    }));
    setActiveVariantIndex(config.variants.length);
  };

  const updateVariant = (vId: string, updates: Partial<Variant>) => {
    setConfig((c) => ({ ...c, variants: c.variants.map((v) => (v.id === vId ? { ...v, ...updates } : v)) }));
  };

  const deleteVariant = (vId: string) => {
    setConfig((c) => ({ ...c, variants: c.variants.filter((v) => v.id !== vId) }));
    setActiveVariantIndex(0);
  };

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await api.updatePlayerConfig(id, { headlinesConfig: config });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const toggleAbTest = (running: boolean) => setConfig((c) => ({ ...c, abTestStatus: running ? "running" : "completed" }));
  const declareWinner = (variantId: string) => setConfig((c) => ({
    ...c, abTestStatus: "completed",
    variants: c.variants.map((v) => ({ ...v, isWinner: v.id === variantId, isEliminated: v.id !== variantId })),
  }));

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  const activeVariant = config.variants[activeVariantIndex] || config.variants[0];
  const isOverlay = config.position === "overlay-top" || config.position === "overlay-bottom";
  const abTestRunning = config.abTestStatus === "running";

  // Load fonts for all text variants
  config.variants.forEach((v) => {
    if (v.type === "text" && v.style?.fontFamily && v.style.fontFamily !== "sans-serif") {
      loadGoogleFont(v.style.fontFamily);
    }
  });

  // Render headline content for preview
  const renderHeadlinePreview = (variant: Variant | undefined) => {
    if (!variant) return <div className="text-muted-foreground text-sm italic py-4 text-center">Add a headline variant to see preview</div>;
    if (variant.type === "text") {
      const ff = variant.style?.fontFamily || "sans-serif";
      const fontFamilyCSS = ff === "sans-serif" ? "sans-serif" : `'${ff}', sans-serif`;
      return (
        <div style={{
          fontSize: variant.style?.fontSize || "28px",
          fontWeight: variant.style?.fontWeight || "700",
          fontFamily: fontFamilyCSS,
          color: variant.style?.color || "#ffffff",
          textAlign: (variant.style?.textAlign as any) || "center",
          padding: variant.style?.padding || "12px 16px",
          backgroundColor: variant.style?.backgroundColor || "transparent",
        }}>
          {variant.text || "Your headline here..."}
        </div>
      );
    }
    if (variant.imageUrl) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={variant.imageUrl} alt={variant.altText || ""} className="w-full" style={{ maxHeight: "120px", objectFit: "contain" }} />;
    }
    return <div className="text-muted-foreground text-sm italic py-4 text-center">Set an image URL to see preview</div>;
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Headlines</h1>
          <p className="text-muted-foreground">Add a text, image, or GIF headline around your video. A/B test variants to find the best performer.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6"><AlertCircle className="w-4 h-4" /> {error}</div>}

      {/* ===== LIVE PREVIEW ===== */}
      <Card className="mb-6">
        <CardTitle className="mb-3 text-base uppercase tracking-wide text-muted-foreground">Live Preview</CardTitle>
        <CardContent className="p-0">
          <div className="rounded-xl overflow-hidden border border-border">
            {/* Headline ABOVE */}
            {config.position === "above" && activeVariant && (
              <div style={{ backgroundColor: config.containerBg, paddingTop: `${config.paddingTop}px`, paddingBottom: `${config.paddingBottom}px` }}>
                {renderHeadlinePreview(activeVariant)}
              </div>
            )}

            {/* Video */}
            <div className="relative w-full aspect-video bg-black">
              {posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
              )}
              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white/50 border-b-[10px] border-b-transparent ml-1.5" />
                </div>
              </div>
              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div className="h-full bg-primary w-1/3" />
              </div>

              {/* Headline OVERLAY-TOP */}
              {config.position === "overlay-top" && activeVariant && (
                <div className="absolute top-0 left-0 right-0 z-10" style={{ backgroundColor: config.containerBg !== "transparent" ? config.containerBg : "rgba(0,0,0,0.5)", paddingTop: `${config.paddingTop}px`, paddingBottom: `${config.paddingBottom}px` }}>
                  {renderHeadlinePreview(activeVariant)}
                </div>
              )}

              {/* Headline OVERLAY-BOTTOM */}
              {config.position === "overlay-bottom" && activeVariant && (
                <div className="absolute bottom-0 left-0 right-0 z-10" style={{ backgroundColor: config.containerBg !== "transparent" ? config.containerBg : "rgba(0,0,0,0.5)", paddingTop: `${config.paddingTop}px`, paddingBottom: `${config.paddingBottom + 4}px` }}>
                  {renderHeadlinePreview(activeVariant)}
                </div>
              )}
            </div>

            {/* Headline BELOW */}
            {config.position === "below" && activeVariant && (
              <div style={{ backgroundColor: config.containerBg, paddingTop: `${config.paddingTop}px`, paddingBottom: `${config.paddingBottom}px` }}>
                {renderHeadlinePreview(activeVariant)}
              </div>
            )}
          </div>

          {/* Variant tabs for preview */}
          {config.variants.length > 1 && (
            <div className="flex gap-1 mt-3">
              {config.variants.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setActiveVariantIndex(i)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${i === activeVariantIndex ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  Variant {String.fromCharCode(65 + i)}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== LAYOUT & SPACING ===== */}
      <Card className="mb-6">
        <CardTitle className="mb-4">Layout & Spacing</CardTitle>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Position</label>
              <select value={config.position} onChange={(e) => setConfig((c) => ({ ...c, position: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                <option value="above">Above the player</option>
                <option value="below">Below the player</option>
                <option value="overlay-top">Overlay — top of video</option>
                <option value="overlay-bottom">Overlay — bottom of video</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Animation</label>
              <select value={config.animation} onChange={(e) => setConfig((c) => ({ ...c, animation: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                <option value="none">None</option>
                <option value="fade">Fade in</option>
                <option value="slide-down">Slide down</option>
                <option value="slide-up">Slide up</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Top Padding</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="60" value={config.paddingTop} onChange={(e) => setConfig((c) => ({ ...c, paddingTop: parseInt(e.target.value) }))} className="flex-1" />
                <span className="text-xs text-muted-foreground w-8">{config.paddingTop}px</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Bottom Padding</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="60" value={config.paddingBottom} onChange={(e) => setConfig((c) => ({ ...c, paddingBottom: parseInt(e.target.value) }))} className="flex-1" />
                <span className="text-xs text-muted-foreground w-8">{config.paddingBottom}px</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Container Background</label>
              <div className="flex gap-2">
                <input type="color" value={config.containerBg === "transparent" ? "#000000" : config.containerBg} onChange={(e) => setConfig((c) => ({ ...c, containerBg: e.target.value }))} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <select value={config.containerBg === "transparent" ? "transparent" : "custom"} onChange={(e) => setConfig((c) => ({ ...c, containerBg: e.target.value === "transparent" ? "transparent" : c.containerBg === "transparent" ? "#000000" : c.containerBg }))} className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm">
                  <option value="transparent">Transparent</option>
                  <option value="custom">Custom color</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== A/B TESTING ===== */}
      <Card className="mb-6">
        <CardTitle className="flex items-center gap-2 mb-4"><Beaker className="w-5 h-5 text-primary" /> A/B Testing</CardTitle>
        <CardContent>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <div className="font-medium text-sm">Enable A/B Test</div>
              <div className="text-xs text-muted-foreground">Split traffic between headline variants to find the best performer</div>
            </div>
            <button onClick={() => setConfig((c) => ({ ...c, abTestEnabled: !c.abTestEnabled }))} className={`relative w-11 h-6 rounded-full transition-colors ${config.abTestEnabled ? "bg-primary" : "bg-muted"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${config.abTestEnabled ? "translate-x-5" : ""}`} />
            </button>
          </div>
          {config.abTestEnabled && (
            <>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <div className="font-medium text-sm">Test &quot;No Headline&quot; variant</div>
                  <div className="text-xs text-muted-foreground">Include a control group with no headline</div>
                </div>
                <button onClick={() => setConfig((c) => ({ ...c, includeNoHeadlineVariant: !c.includeNoHeadlineVariant }))} className={`relative w-11 h-6 rounded-full transition-colors ${config.includeNoHeadlineVariant ? "bg-primary" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${config.includeNoHeadlineVariant ? "translate-x-5" : ""}`} />
                </button>
              </div>
              <div className="flex gap-3 mt-4">
                {!abTestRunning ? (
                  <Button onClick={() => toggleAbTest(true)}><Play className="w-4 h-4 mr-2" /> Start Test</Button>
                ) : (
                  <Button variant="destructive" onClick={() => toggleAbTest(false)}>Stop Test</Button>
                )}
                {config.abTestStatus === "completed" && <Badge variant="success">Test Completed</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Click &quot;Save Changes&quot; to apply.</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== VARIANTS ===== */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Variants {config.variants.length > 0 && <span className="text-muted-foreground">({config.variants.length})</span>}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addVariant("text")}><Type className="w-4 h-4 mr-1" /> Text</Button>
          <Button variant="outline" size="sm" onClick={() => addVariant("image")}><Image className="w-4 h-4 mr-1" /> Image</Button>
          <Button variant="outline" size="sm" onClick={() => addVariant("gif")}><Play className="w-4 h-4 mr-1" /> GIF</Button>
        </div>
      </div>

      {config.variants.map((variant, index) => (
        <Card key={variant.id} className="mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveVariantIndex(index)} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${index === activeVariantIndex ? "bg-primary text-white" : "bg-primary/10"}`}>
                {variant.type === "text" ? <Type className={`w-5 h-5 ${index === activeVariantIndex ? "text-white" : "text-primary"}`} /> : <Image className={`w-5 h-5 ${index === activeVariantIndex ? "text-white" : "text-primary"}`} />}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Variant {String.fromCharCode(65 + index)}</span>
                  <Badge variant={variant.type === "text" ? "info" : "default"}>{variant.type.toUpperCase()}</Badge>
                  {variant.isWinner && <Badge variant="success"><Trophy className="w-3 h-3 mr-1" /> Winner</Badge>}
                  {variant.isEliminated && <Badge variant="error">Eliminated</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">Click to preview this variant above</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteVariant(variant.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>

          <CardContent className="p-0">
            {variant.type === "text" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Headline Text</label>
                  <Input value={variant.text || ""} onChange={(e) => updateVariant(variant.id, { text: e.target.value })} placeholder="Your compelling headline here..." />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3">
                    <label className="text-xs font-medium mb-1 block">Font Family</label>
                    <select
                      value={variant.style?.fontFamily || "sans-serif"}
                      onChange={(e) => {
                        const f = e.target.value;
                        if (f !== "sans-serif") loadGoogleFont(f);
                        updateVariant(variant.id, { style: { ...variant.style, fontFamily: f } });
                      }}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                      style={{ fontFamily: variant.style?.fontFamily && variant.style.fontFamily !== "sans-serif" ? `'${variant.style.fontFamily}', sans-serif` : "sans-serif" }}
                    >
                      <option value="sans-serif">System Default (Sans-serif)</option>
                      {googleFonts.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Font Size</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min="14" max="48" value={parseInt(variant.style?.fontSize || "28")} onChange={(e) => updateVariant(variant.id, { style: { ...variant.style, fontSize: `${e.target.value}px` } })} className="flex-1" />
                      <span className="text-xs text-muted-foreground w-10">{variant.style?.fontSize || "28px"}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Font Weight</label>
                    <select value={variant.style?.fontWeight || "700"} onChange={(e) => updateVariant(variant.id, { style: { ...variant.style, fontWeight: e.target.value } })} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                      <option value="400">Normal</option>
                      <option value="500">Medium</option>
                      <option value="600">Semi Bold</option>
                      <option value="700">Bold</option>
                      <option value="800">Extra Bold</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Text Color</label>
                    <div className="flex gap-1">
                      <input type="color" value={variant.style?.color || "#ffffff"} onChange={(e) => updateVariant(variant.id, { style: { ...variant.style, color: e.target.value } })} className="w-10 h-10 rounded border border-border cursor-pointer" />
                      <Input value={variant.style?.color || "#ffffff"} onChange={(e) => updateVariant(variant.id, { style: { ...variant.style, color: e.target.value } })} className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Background</label>
                    <div className="flex gap-1">
                      <input type="color" value={variant.style?.backgroundColor === "transparent" ? "#000000" : (variant.style?.backgroundColor || "#000000")} onChange={(e) => updateVariant(variant.id, { style: { ...variant.style, backgroundColor: e.target.value } })} className="w-10 h-10 rounded border border-border cursor-pointer" />
                      <select value={variant.style?.backgroundColor === "transparent" ? "transparent" : "custom"} onChange={(e) => updateVariant(variant.id, { style: { ...variant.style, backgroundColor: e.target.value === "transparent" ? "transparent" : variant.style?.backgroundColor || "#000000" } })} className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm">
                        <option value="transparent">None</option>
                        <option value="custom">Color</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Align</label>
                    <div className="flex gap-1">
                      {(["left", "center", "right"] as const).map((a) => (
                        <button key={a} onClick={() => updateVariant(variant.id, { style: { ...variant.style, textAlign: a } })} className={`flex-1 h-10 rounded-lg border text-xs font-medium transition-colors ${variant.style?.textAlign === a || (!variant.style?.textAlign && a === "center") ? "bg-primary text-white border-primary" : "border-border bg-background hover:bg-muted"}`}>
                          {a.charAt(0).toUpperCase() + a.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Inner Padding</label>
                    <Input value={variant.style?.padding || "12px 16px"} onChange={(e) => updateVariant(variant.id, { style: { ...variant.style, padding: e.target.value } })} placeholder="12px 16px" />
                  </div>
                </div>
              </div>
            )}

            {(variant.type === "image" || variant.type === "gif") && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2"><Monitor className="w-4 h-4" /> Desktop Image <span className="text-xs text-muted-foreground font-normal">Recommended: 1500x200px</span></label>
                  <Input value={variant.imageUrl || ""} onChange={(e) => updateVariant(variant.id, { imageUrl: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Mobile Image (optional)</label>
                  <Input value={variant.mobileImageUrl || ""} onChange={(e) => updateVariant(variant.id, { mobileImageUrl: e.target.value })} placeholder="Separate image for mobile" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Alt Text</label>
                  <Input value={variant.altText || ""} onChange={(e) => updateVariant(variant.id, { altText: e.target.value })} placeholder="Describe the image" />
                </div>
              </div>
            )}

            {/* A/B Test stats */}
            {config.abTestEnabled && abTestRunning && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3"><BarChart3 className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium text-muted-foreground">Test Results</span></div>
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { label: "Impressions", value: variant.impressions.toLocaleString() },
                    { label: "Plays", value: variant.plays.toLocaleString() },
                    { label: "Play Rate", value: variant.impressions > 0 ? `${((variant.plays / variant.impressions) * 100).toFixed(1)}%` : "—" },
                    { label: "Conversions", value: String(variant.conversions) },
                    { label: "Conv. Rate", value: variant.conversionRate > 0 ? `${variant.conversionRate.toFixed(2)}%` : "—" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="text-lg font-semibold">{s.value}</div>
                    </div>
                  ))}
                </div>
                {!variant.isWinner && !variant.isEliminated && (
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => declareWinner(variant.id)}><Trophy className="w-3.5 h-3.5 mr-1" /> Declare Winner</Button>
                  </div>
                )}
              </div>
            )}

            {config.abTestEnabled && config.variants.length > 1 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Traffic Weight</label>
                  <span className="text-xs text-muted-foreground">{variant.weight}%</span>
                </div>
                <input type="range" min="0" max="100" value={variant.weight} onChange={(e) => updateVariant(variant.id, { weight: parseInt(e.target.value) })} className="w-full mt-1" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {config.variants.length === 0 && (
        <Card className="border-dashed">
          <div className="flex flex-col items-center gap-4 py-12">
            <Type className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No headlines configured. Add a text, image, or GIF headline.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => addVariant("text")}><Type className="w-4 h-4 mr-1" /> Add Text</Button>
              <Button variant="outline" onClick={() => addVariant("image")}><Image className="w-4 h-4 mr-1" /> Add Image</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
