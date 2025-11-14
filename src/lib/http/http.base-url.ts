export function getBaseUrl(request: Request): string {
  const envFromNode = typeof process !== "undefined" ? process.env.PUBLIC_SITE_URL : undefined;
  const envFromVite =
    (typeof import.meta !== "undefined" ? (import.meta as unknown as ImportMetaEnv).env?.PUBLIC_SITE_URL : undefined) ||
    "";

  const raw =
    (envFromNode && envFromNode.length > 0 && envFromNode) ||
    (envFromVite && envFromVite.length > 0 && envFromVite) ||
    new URL(request.url).origin;

  return raw.replace(/\/$/, "");
}
