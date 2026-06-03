import { NextResponse, type NextRequest } from "next/server";

/**
 * kerf.box is account-free: there is no auth layer to gate routes on.
 * Every page is public, and the API routes authorize per-request on the
 * caller's own Anthropic key (BYOK) — there are no sessions or server-side
 * accounts to protect. This middleware is a deliberate pass-through; it
 * exists only so the matcher config stays colocated if we ever add edge
 * logic (headers, redirects) later.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
