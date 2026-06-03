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
