import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SecurityProvider from "@/components/SecurityProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Interview Examination System",
  description: "AI-powered technical interview platform with proctoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SecurityProvider>
          {children}
        </SecurityProvider>
      </body>
    </html>
  );
}
