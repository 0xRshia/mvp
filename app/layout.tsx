import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/event/app-shell";
import { ThemeProvider } from "@/components/event/theme-provider";
import { AppNavigation } from "@/components/event/app-navigation";
import { EventBrowseProvider } from "@/components/event/event-browse-provider";
export const metadata: Metadata = {
  title: "هم‌قدم | کشف ایونت‌های تهران",
  description:
    "یک قرار خوب، همین نزدیکی. ایونت‌های کافه‌های تهران را پیدا کنید و بلیت بگیرید.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* The app provides its own accessible light and dark themes. */}
        <meta name="darkreader-lock" />
        {["Regular", "ExtraBold", "Black"].map((weight) => (
          <link key={weight} rel="preload" as="font" type="font/woff2"
            href={`/fonts/iransansx/IRANSansX-${weight}.woff2`} crossOrigin="anonymous" />
        ))}
      </head>
      <body>
        <ThemeProvider>
          <AppNavigation><EventBrowseProvider><AppShell>{children}</AppShell></EventBrowseProvider></AppNavigation>
        </ThemeProvider>
      </body>
    </html>
  );
}
