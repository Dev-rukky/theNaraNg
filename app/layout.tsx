import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

// Import your custom ThemeProvider
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
  // 1. Await the cookies object (Required in Next.js 15+)
  const cookieStore = await cookies();
  
  // 2. Read the theme from the cookie, default to "dark" if it doesn't exist
  const theme = (cookieStore.get("nara:theme")?.value as "dark" | "light") || "dark";

  return (
    // 3. Apply the theme directly to the HTML tag on the server!
    <html lang="en" className={theme} style={{ colorScheme: theme }}>
      <body className="font-sans antialiased bg-background text-foreground">
        
        {/* 4. Pass the server-read theme into the client provider */}
        <ThemeProvider initialTheme={theme}>
          {children}
        </ThemeProvider>
        
      </body>
    </html>
  );
}