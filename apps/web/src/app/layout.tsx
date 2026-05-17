import type { Metadata } from "next";
import "./globals.css";
import { SocketProvider } from "@/lib/socket";

export const metadata: Metadata = {
  title: "FUMIK | Play, Chat & Link Up",
  description: "The ultimate social gaming platform. Play 100+ games, video call, and chat with friends in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-body bg-background text-slate-900" suppressHydrationWarning>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
