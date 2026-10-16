import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AZS: The Catalyst",
    template: "%s · AZS: The Catalyst",
  },
  description:
    "Physics and Chemistry coaching platform with lectures, study sheets, progress tracking, and an AI academic tutor.",
  keywords: [
    "AZS",
    "EdTech",
    "Physics",
    "Chemistry",
    "AI Tutor",
    "Coaching",
    "HSC",
    "Admission",
  ],
  authors: [{ name: "AZS" }],
  openGraph: {
    title: "AZS: The Catalyst",
    description:
      "AI-powered Physics & Chemistry coaching — lectures, progress, and an academic tutor.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf8f5",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground antialiased selection:bg-indigo-100 selection:text-indigo-900">
        {children}
      </body>
    </html>
  );
}
