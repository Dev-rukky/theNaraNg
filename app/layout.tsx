import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import "./globals.css";

import { ThemeProvider } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Nara | Prediction Markets",
  description: "Data and analytics layer for regional prediction markets",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  const theme =
    (cookieStore.get("nara:theme")?.value as "dark" | "light") || "dark";

  return (
    <html lang="en" className={theme} style={{ colorScheme: theme }}>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
        <Toaster theme='dark' position="top-center" />
      </body>
    </html>
  );
}
