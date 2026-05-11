import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "kerf.box — Strategy is a cut, not a story",
  description:
    "kerf.box maps where your category clusters, finds the narrow defensible cut, and ships a wedge with a structural moat. If the moat doesn't hold, the system refuses to ship.",
};

const hasClerk = !!(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const body = (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
  if (!hasClerk) return body;
  return <ClerkProvider>{body}</ClerkProvider>;
}
