// Writes and script-only reads require the shared secret the scripts hold. Unset secret = everything refused.
export function requireSecret(secret: string): void {
  const want = process.env.CONVEX_WRITE_SECRET;
  if (!want || secret !== want) throw new Error("not allowed");
}
