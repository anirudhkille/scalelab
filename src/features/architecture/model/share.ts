import { architectureSchema, type Architecture } from "./schema";

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64Url(value: string): string {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(`${normalized}${padding}`);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function encodeArchitecture(architecture: Architecture): string {
  return toBase64Url(JSON.stringify(architecture));
}

export function decodeArchitecture(payload: string): Architecture | null {
  if (payload.length === 0) {
    return null;
  }

  try {
    return architectureSchema.parse(JSON.parse(fromBase64Url(payload)));
  } catch {
    return null;
  }
}
