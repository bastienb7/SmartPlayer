import Link from "next/link";
import { Zap, Play, BarChart3, MousePointer, Timer, Repeat } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">SmartPlayer</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition">
              Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-6">
          <Zap className="w-4 h-4" /> 100% focused on conversion
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          The Video Player That{" "}
          <span className="text-primary">Sells More</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Host your sales videos with smart autoplay, fictitious progress bars,
          synchronized CTAs, and deep analytics — all designed to maximize conversions.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-primary text-primary-foreground px-8 py-3 rounded-lg text-base font-semibold hover:bg-primary/90 transition"
          >
            Start Free Trial
          </Link>
          <Link
            href="#features"
            className="border border-border px-8 py-3 rounded-lg text-base font-medium hover:bg-muted transition"
          >
            See Features
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Everything You Need to Convert</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
          13 conversion-focused features that work together to keep viewers watching and clicking.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Play, title: "Smart Autoplay", desc: "Videos start muted with a persuasive overlay. One click restarts from the beginning with sound." },
            { icon: Timer, title: "Fictitious Progress", desc: "Progress bar moves fast at the start, making videos feel shorter and reducing drop-off." },
            { icon: MousePointer, title: "Synchronized CTAs", desc: "Call-to-action buttons appear at the exact moment in your sales pitch for maximum impact." },
            { icon: Repeat, title: "Resume Play", desc: "Viewers pick up where they left off — perfect for remarketing campaigns." },
            { icon: BarChart3, title: "Deep Analytics", desc: "Track plays, retention curves, CTA clicks, and conversion funnels in real-time." },
            { icon: Zap, title: "A/B Testing", desc: "Test different videos, headlines, and playback speeds to find the highest-converting version." },
          ].map((feature) => (
            <div key={feature.title} className="bg-card border border-border rounded-xl p-6">
              <feature.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} SmartPlayer. Built for conversions.
      </footer>
    </div>
  );
}
