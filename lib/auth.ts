function hasClerk(): boolean {
  return !!(
    process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  );
}

export async function currentUserIdOrNull(): Promise<string | null> {
  if (!hasClerk()) return null;
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  return userId ?? null;
}

/**
 * The signed-in user's primary email, or null. Used only to pre-fill the
 * Stripe Checkout form (a convenience — Stripe collects it anyway). Reads
 * the full user object, so call sparingly (billing routes only), not on
 * the inference hot path.
 */
export async function currentUserEmailOrNull(): Promise<string | null> {
  if (!hasClerk()) return null;
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  return user?.primaryEmailAddress?.emailAddress ?? null;
}
