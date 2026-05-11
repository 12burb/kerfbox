import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const hasClerk = !!(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

// Page routes get hard middleware protection (redirect to sign-in).
// API routes do their own dual auth (session OR Bearer cmo_live_...) inside
// the route handlers so MCP/agent callers can authenticate without a cookie.
const isProtected = createRouteMatcher([
  "/brief(.*)",
  "/briefs(.*)",
  "/app/keys(.*)",
]);

const gated = clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect();
  }
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (!hasClerk) return NextResponse.next();
  return gated(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
