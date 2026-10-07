import type { Metadata, Viewport } from "next";
import { Backdrop } from "@/components/Backdrop";
import { MotionProvider } from "@/components/motion";
import { DemoProvider } from "@/demo/store";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Gem Quest · Demo",
  description: "Interactive demo of PMI DNA: The Gem Quest — data stays in your browser.",
};

export default function DemoRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Backdrop />
        <MotionProvider>
          <DemoProvider>{children}</DemoProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
