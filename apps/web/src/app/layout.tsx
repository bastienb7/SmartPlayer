import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartPlayer — Video Player for Conversions",
  description: "The most performant video player focused on conversion. Host, optimize, and track your sales videos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
