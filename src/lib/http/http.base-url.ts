export function getBaseUrl(request: Request): string {
  const envFromNode = typeof process !== "undefined" ? process.env.PUBLIC_SITE_URL : undefined;
  const envFromVite = import.meta.env.PUBLIC_SITE_URL ?? "";

  const raw =
    (envFromNode && envFromNode.length > 0 && envFromNode) ||
    (envFromVite && envFromVite.length > 0 && envFromVite) ||
    new URL(request.url).origin;

  return raw.replace(/\/$/, "");
}
