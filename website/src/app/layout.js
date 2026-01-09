import { Space_Grotesk, Noto_Sans, Noto_Sans_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const notoSans = Noto_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSansMono = Noto_Sans_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Sentinel - Self-Hosted System Monitoring",
  description: "Monitor your distributed infrastructure with a lightweight Go agent. Real-time metrics via gRPC, Docker management, and secure remote control.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
      </head>
      <body
        className={`${spaceGrotesk.variable} ${notoSans.variable} ${notoSansMono.variable} antialiased bg-background-dark text-[#f3f4f6] font-display overflow-x-hidden selection:bg-primary/30 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
