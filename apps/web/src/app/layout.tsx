import type { Metadata } from "next";
import "./globals.css";
import { SocketProvider } from "@/lib/socket";
import React from "react";

export const metadata: Metadata = {
  title: "FUMIK | Play, Chat & Link Up",
  description: "The ultimate social gaming platform. Play 100+ games, video call, and chat with friends, video call, and chat with friends in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-body bg-slate-950 text-white selection:bg-orange-500/30" suppressHydrationWarning>
        <SocketProvider>
          <div className="relative min-h-screen">
            {children}
          </div>
        </SocketProvider>
      </body>
    </html>
  );
}
