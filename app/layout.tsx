import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Serif headlines are what separate "a page you read" from "a dashboard you
// scan". Newsreader is variable across weight and optical size, so one family
// covers the 40px lead and the 15px feed row without a second webfont.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "India Policy & Business Dashboard",
  description:
    "New Indian government policy, regulation, subsidies, business opportunities, tech & innovation pushes, economy, investment, trade, and geopolitics — pulled from official and news sources.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 sm:px-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
