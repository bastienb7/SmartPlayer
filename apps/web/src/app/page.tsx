import Link from "next/link";
import { Zap, Play, BarChart3, MousePointer, Timer, Repeat, Eye, Gauge, Code, Shield, Layers, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">SmartPlayer</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition">
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-28 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-8 border border-primary/20">
          <Sparkles className="w-4 h-4" /> 100% focused on conversion
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
          The Video Player That{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Sells More
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
          Host your sales videos with smart autoplay, fictitious progress bars,
          synchronized CTAs, and deep analytics. All designed to maximize conversions.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-primary text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-primary/90 shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all"
          >
            Start Free Trial
          </Link>
          <Link
            href="#features"
            className="border border-border px-8 py-3.5 rounded-xl text-base font-medium hover:bg-white/5 hover:border-border-light transition-all"
          >
            See Features
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-3">Everything You Need to Convert</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
          20+ conversion-focused features that work together to keep viewers watching and clicking.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Play, title: "Smart Autoplay", desc: "Videos start muted with a persuasive overlay. One click restarts from the beginning with sound.", color: "text-primary" },
            { icon: Timer, title: "Smart Progress", desc: "Progress bar moves fast at the start, making videos feel shorter. Adapts to real retention data.", color: "text-secondary" },
            { icon: MousePointer, title: "Synchronized CTAs", desc: "Call-to-action buttons appear at the exact moment in your sales pitch. Scroll to Action included.", color: "text-warning" },
            { icon: Repeat, title: "Resume Play", desc: "Viewers pick up where they left off. Perfect for remarketing campaigns.", color: "text-primary" },
            { icon: BarChart3, title: "Deep Analytics", desc: "Heatmaps, retention curves, attention scores, UTM cohorts, and real-time A/B comparison.", color: "text-secondary" },
            { icon: Layers, title: "Video Funnels", desc: "Sequence multiple videos seamlessly. A/B test each step independently.", color: "text-warning" },
            { icon: Eye, title: "Exit-Intent Popup", desc: "Detect when viewers are about to leave. Context-aware messages based on video progress.", color: "text-primary" },
            { icon: Gauge, title: "Turbo Speed", desc: "A/B test playback speeds up to 1.5x. Auto-syncs with all timed features.", color: "text-secondary" },
            { icon: Code, title: "Page Sync", desc: "Show, hide, or animate any element on your page synchronized with video timestamps.", color: "text-warning" },
            { icon: Shield, title: "Pixel Tracking", desc: "Auto-fire events every 5% to Facebook, Google, TikTok, Pinterest, and Taboola.", color: "text-primary" },
            { icon: Sparkles, title: "Headlines A/B", desc: "Test text, image, or GIF headlines. Auto-winner with statistical significance.", color: "text-secondary" },
            { icon: Play, title: "Picture-in-Picture", desc: "Floating mini-player when viewers scroll. Video keeps playing while they read your page.", color: "text-warning" },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-card border border-border rounded-xl p-6 hover:border-border-light hover:bg-card-hover transition-all group"
            >
              <feature.icon className={`w-7 h-7 ${feature.color} mb-4 group-hover:scale-110 transition-transform`} />
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-3">Simple Pricing</h2>
        <p className="text-muted-foreground text-center mb-16">Start free, scale as you grow.</p>
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { name: "Free", price: "$0", plays: "1K plays/mo", videos: "1 video", features: ["Smart Autoplay", "Basic Analytics", "Embed Code"], cta: "Get Started" },
            { name: "Starter", price: "$29", plays: "10K plays/mo", videos: "10 videos", features: ["All player features", "CTA Buttons", "Pixel Tracking", "Email support"], cta: "Start Trial" },
            { name: "Pro", price: "$79", plays: "100K plays/mo", videos: "50 videos", popular: true, features: ["Everything in Starter", "A/B Testing", "Video Funnels", "Attention Score", "Priority support"], cta: "Start Trial" },
            { name: "Enterprise", price: "$249", plays: "1M plays/mo", videos: "Unlimited", features: ["Everything in Pro", "White-label", "API Access", "Dedicated support"], cta: "Contact Us" },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`bg-card border rounded-xl p-6 flex flex-col ${
                plan.popular
                  ? "border-primary/50 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative"
                  : "border-border hover:border-border-light"
              } transition-all`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <div className="mt-3 mb-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.price !== "$0" && <span className="text-muted-foreground text-sm">/mo</span>}
              </div>
              <p className="text-xs text-muted-foreground mb-4">{plan.plays} · {plan.videos}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="text-primary text-xs">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className={`text-center py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  plan.popular
                    ? "bg-primary text-white hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    : "border border-border hover:bg-white/5 hover:border-primary/40"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} SmartPlayer. Built for conversions.
      </footer>
    </div>
  );
}
