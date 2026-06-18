import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "next-themes";
import { Providers } from "@/lib/provider"; // <-- Import your new wrapper

export const metadata: Metadata = {
  title: "Nara | Prediction Markets",
  description: "Data and analytics layer for regional prediction markets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" storageKey="nara:theme">
          
          
          <Providers>
            {children}
          </Providers>

        </ThemeProvider>
      </body>
    </html>
  );
}