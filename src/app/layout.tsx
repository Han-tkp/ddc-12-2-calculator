import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { FeedbackDialog } from '@/components/feedback-dialog';
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ระบบคำนวณสารเคมีพ่นยุง",
  description: "เครื่องคำนวณสารเคมีสำหรับงานพ่นกำจัดยุง คำนวณจากอัตราส่วนผสมและอัตราการพ่นต่อพื้นที่",
  keywords: ["สารเคมี", "พ่นยุง", "คำนวณ", "ควบคุมยุง", "สาธารณสุข"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${sarabun.variable} font-sans antialiased`}
        style={{ fontFamily: 'var(--font-sarabun), sans-serif' }}
        suppressHydrationWarning
      >
        {children}
        <FeedbackDialog />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

