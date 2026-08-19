import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { PreferencesScript } from "@/components/PreferencesScript";
import { AppRuntime } from "@/components/AppRuntime";
import { KeyboardLayer } from "@/components/KeyboardLayer";
import { BackToTop } from "@/components/BackToTop";
import { OfflineBanner } from "@/components/OfflineBanner";
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
  // A template, so the name lives in exactly one place: every page below sets
  // only its own title and gets " · Meridian" appended. Repeating the masthead
  // in five files is how a rename leaves half a site on the old name.
  title: {
    default: "Meridian - Policy, business & markets",
    template: "%s · Meridian",
  },
  description:
    "New Indian government policy, regulation, subsidies, business opportunities, tech & innovation pushes, economy, investment, trade, and geopolitics - pulled from official and news sources.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The pre-paint script rewrites data-theme/data-density on this element
      // before React sees it, which is a mismatch by construction, not a bug.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
      // Overwritten before paint by PreferencesScript; the attribute is
      // declared here so the very first frame of a fresh document already has
      // a theme rather than inheriting one mid-render.
      data-theme="light"
      data-density="comfortable"
    >
      <body className="flex min-h-full flex-col">
        <PreferencesScript />

        {/* First tab stop on every page. Eight sections, two rows of nav and a
            search field stand between the top of the document and the day's
            stories - that is a lot of tabbing for a keyboard reader who came
            to read. */}
        <a href="#main" className="skip-link">
          Skip to the stories
        </a>

        <Header />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 sm:px-8">
          {children}
        </main>
        <SiteFooter />

        <AppRuntime />
        <KeyboardLayer />
        <BackToTop />
        <OfflineBanner />
      </body>
    </html>
  );
}
