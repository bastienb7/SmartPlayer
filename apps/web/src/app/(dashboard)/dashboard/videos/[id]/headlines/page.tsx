"use client";

import { use, useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, Image, Type, Play, Trophy, Beaker, BarChart3, Smartphone, Monitor, Upload,
} from "lucide-react";

type VariantType = "text" | "image" | "gif";

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
    color?: string;
    backgroundColor?: string;
    textAlign?: string;
  };
  weight: number;
  impressions: number;
  plays: number;
  conversions: number;
  conversionRate: number;
  isWinner: boolean;
  isEliminated: boolean;
}

export default function HeadlinesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [abTestRunning, setAbTestRunning] = useState(false);
  const [includeNoHeadline, setIncludeNoHeadline] = useState(false);
  const [position, setPosition] = useState<string>("above");
  const [animation, setAnimation] = useState<string>("fade");
  const [variants, setVariants] = useState<Variant[]>([
    {
      id: "v1",
      type: "text",
      text: "Watch This Amazing Video Now!",
      style: { fontSize: "28px", fontWeight: "700", color: "#ffffff", textAlign: "center" },
      weight: 100,
      impressions: 1234,
      plays: 987,
      conversions: 45,
      conversionRate: 4.56,
      isWinner: false,
      isEliminated: false,
    },
  ]);

  const addVariant = (type: VariantType) => {
    const newVariant: Variant = {
      id: Date.now().toString(),
      type,
      text: type === "text" ? "New headline variant" : undefined,
      imageUrl: type !== "text" ? "" : undefined,
      weight: 100,
      impressions: 0,
      plays: 0,
      conversions: 0,
      conversionRate: 0,
      isWinner: false,
      isEliminated: false,
    };
    setVariants([...variants, newVariant]);
  };

  const updateVariant = (vId: string, updates: Partial<Variant>) => {
    setVariants(variants.map((v) => (v.id === vId ? { ...v, ...updates } : v)));
  };

  const deleteVariant = (vId: string) => {
    setVariants(variants.filter((v) => v.id !== vId));
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Headlines</h1>
          <p className="text-muted-foreground">
            Create text, image, or GIF headlines above your video. A/B test to find the best performer.
          </p>
        </div>
        <Button>Save Changes</Button>
      </div>

      {/* Display Settings */}
      <Card className="mb-6">
        <CardTitle className="mb-4">Display Settings</CardTitle>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="above">Above the player</option>
                <option value="below">Below the player</option>
                <option value="overlay-top">Overlay — top of video</option>
                <option value="overlay-bottom">Overlay — bottom of video</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Animation</label>
              <select
                value={animation}
                onChange={(e) => setAnimation(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="none">None</option>
                <option value="fade">Fade in</option>
                <option value="slide-down">Slide down</option>
                <option value="slide-up">Slide up</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* A/B Test Controls */}
      <Card className="mb-6">
        <CardTitle className="flex items-center gap-2 mb-4">
          <Beaker className="w-5 h-5 text-primary" /> A/B Testing
        </CardTitle>
        <CardContent>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <div className="font-medium text-sm">Enable A/B Test</div>
              <div className="text-xs text-muted-foreground">
                Split traffic between headline variants to find the best performer
              </div>
            </div>
            <button
              onClick={() => setAbTestEnabled(!abTestEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${abTestEnabled ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${abTestEnabled ? "translate-x-5" : ""}`} />
            </button>
          </div>

          {abTestEnabled && (
            <>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <div className="font-medium text-sm">Test &quot;No Headline&quot; variant</div>
                  <div className="text-xs text-muted-foreground">
                    Include a variant with no headline to test if any headline helps
                  </div>
                </div>
                <button
                  onClick={() => setIncludeNoHeadline(!includeNoHeadline)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${includeNoHeadline ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${includeNoHeadline ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex gap-3 mt-4">
                {!abTestRunning ? (
                  <Button onClick={() => setAbTestRunning(true)}>
                    <Play className="w-4 h-4 mr-2" /> Start Test
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={() => setAbTestRunning(false)}>
                    Stop Test
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Variants */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Variants {variants.length > 0 && <span className="text-muted-foreground">({variants.length})</span>}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addVariant("text")}>
            <Type className="w-4 h-4 mr-1" /> Add Text
          </Button>
          <Button variant="outline" size="sm" onClick={() => addVariant("image")}>
            <Image className="w-4 h-4 mr-1" /> Add Image
          </Button>
          <Button variant="outline" size="sm" onClick={() => addVariant("gif")}>
            <Play className="w-4 h-4 mr-1" /> Add GIF
          </Button>
        </div>
      </div>

      {/* "No headline" variant card */}
      {abTestEnabled && includeNoHeadline && (
        <Card className="mb-4 border-dashed">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-xs font-mono">
                ---
              </div>
              <div>
                <div className="font-medium text-sm">No Headline (Control)</div>
                <div className="text-xs text-muted-foreground">Tests whether any headline helps at all</div>
              </div>
            </div>
            {abTestRunning && (
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-muted-foreground text-xs">Views</div>
                  <div className="font-medium">0</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-xs">Play Rate</div>
                  <div className="font-medium">—</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-xs">Conv. Rate</div>
                  <div className="font-medium">—</div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Variant cards */}
      {variants.map((variant, index) => (
        <Card key={variant.id} className="mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                {variant.type === "text" ? (
                  <Type className="w-5 h-5 text-primary" />
                ) : (
                  <Image className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Variant {String.fromCharCode(65 + index)}</span>
                  <Badge variant={variant.type === "text" ? "info" : "default"}>
                    {variant.type.toUpperCase()}
                  </Badge>
                  {variant.isWinner && (
                    <Badge variant="success">
                      <Trophy className="w-3 h-3 mr-1" /> Winner
                    </Badge>
                  )}
                  {variant.isEliminated && <Badge variant="error">Eliminated</Badge>}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteVariant(variant.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>

          <CardContent className="p-0">
            {/* Text variant editor */}
            {variant.type === "text" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Headline Text</label>
                  <Input
                    value={variant.text || ""}
                    onChange={(e) => updateVariant(variant.id, { text: e.target.value })}
                    placeholder="Your compelling headline here..."
                  />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Font Size</label>
                    <Input
                      value={variant.style?.fontSize || "28px"}
                      onChange={(e) =>
                        updateVariant(variant.id, {
                          style: { ...variant.style, fontSize: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Font Weight</label>
                    <select
                      value={variant.style?.fontWeight || "700"}
                      onChange={(e) =>
                        updateVariant(variant.id, {
                          style: { ...variant.style, fontWeight: e.target.value },
                        })
                      }
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                    >
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
                      <input
                        type="color"
                        value={variant.style?.color || "#ffffff"}
                        onChange={(e) =>
                          updateVariant(variant.id, {
                            style: { ...variant.style, color: e.target.value },
                          })
                        }
                        className="w-10 h-10 rounded border border-border cursor-pointer"
                      />
                      <Input
                        value={variant.style?.color || "#ffffff"}
                        onChange={(e) =>
                          updateVariant(variant.id, {
                            style: { ...variant.style, color: e.target.value },
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Align</label>
                    <select
                      value={variant.style?.textAlign || "center"}
                      onChange={(e) =>
                        updateVariant(variant.id, {
                          style: { ...variant.style, textAlign: e.target.value },
                        })
                      }
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                {/* Text preview */}
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-2">Preview</div>
                  <div
                    style={{
                      fontSize: variant.style?.fontSize || "28px",
                      fontWeight: variant.style?.fontWeight || "700",
                      color: variant.style?.color || "#ffffff",
                      textAlign: (variant.style?.textAlign as any) || "center",
                    }}
                  >
                    {variant.text || "Your headline here..."}
                  </div>
                </div>
              </div>
            )}

            {/* Image/GIF variant editor */}
            {(variant.type === "image" || variant.type === "gif") && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> Desktop Image
                    <span className="text-xs text-muted-foreground font-normal">Recommended: 1500x200px</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={variant.imageUrl || ""}
                      onChange={(e) => updateVariant(variant.id, { imageUrl: e.target.value })}
                      placeholder="https://... or upload"
                    />
                    <Button variant="outline" size="icon">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> Mobile Image (optional)
                    <span className="text-xs text-muted-foreground font-normal">Recommended: 410x110px</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={variant.mobileImageUrl || ""}
                      onChange={(e) => updateVariant(variant.id, { mobileImageUrl: e.target.value })}
                      placeholder="Separate image for mobile (optional)"
                    />
                    <Button variant="outline" size="icon">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Alt Text</label>
                  <Input
                    value={variant.altText || ""}
                    onChange={(e) => updateVariant(variant.id, { altText: e.target.value })}
                    placeholder="Describe the image for accessibility"
                  />
                </div>

                {/* Image preview */}
                {variant.imageUrl && (
                  <div className="bg-muted rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-2">Preview</div>
                    <img
                      src={variant.imageUrl}
                      alt={variant.altText || ""}
                      className="w-full rounded-lg"
                      style={{ maxHeight: "200px", objectFit: "contain" }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* A/B Test stats (when test is running) */}
            {abTestEnabled && abTestRunning && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Test Results</span>
                </div>
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Impressions</div>
                    <div className="text-lg font-semibold">{variant.impressions.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Plays</div>
                    <div className="text-lg font-semibold">{variant.plays.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Play Rate</div>
                    <div className="text-lg font-semibold">
                      {variant.impressions > 0
                        ? `${((variant.plays / variant.impressions) * 100).toFixed(1)}%`
                        : "—"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Conversions</div>
                    <div className="text-lg font-semibold">{variant.conversions}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Conv. Rate</div>
                    <div className="text-lg font-semibold text-primary">
                      {variant.conversionRate > 0 ? `${variant.conversionRate.toFixed(2)}%` : "—"}
                    </div>
                  </div>
                </div>
                {!variant.isWinner && !variant.isEliminated && variant.impressions >= 100 && (
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm">
                      <Trophy className="w-3.5 h-3.5 mr-1" /> Declare Winner
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Traffic weight (when A/B testing) */}
            {abTestEnabled && variants.length > 1 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Traffic Weight</label>
                  <span className="text-xs text-muted-foreground">{variant.weight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={variant.weight}
                  onChange={(e) => updateVariant(variant.id, { weight: parseInt(e.target.value) })}
                  className="w-full mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {variants.length === 0 && (
        <Card className="border-dashed">
          <div className="flex flex-col items-center gap-4 py-12">
            <Type className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No headlines configured. Add a text, image, or GIF headline.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => addVariant("text")}>
                <Type className="w-4 h-4 mr-1" /> Add Text
              </Button>
              <Button variant="outline" onClick={() => addVariant("image")}>
                <Image className="w-4 h-4 mr-1" /> Add Image
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
