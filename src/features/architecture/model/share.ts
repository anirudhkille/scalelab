import { architectureSchema, type Architecture } from "./schema";

/** A URL-friendly design link must stay small enough for browsers and chat apps. */
export const MAX_SHARE_LINK_LENGTH = 6_000;

/** Reject oversized query payloads before decoding them. */
export const MAX_SHARE_PAYLOAD_LENGTH = 64_000;

const BASE64_CHUNK_SIZE = 0x8000;

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const chunks: string[] = [];

  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + BASE64_CHUNK_SIZE)));
  }

  return btoa(chunks.join("")).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
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
  if (payload.length === 0 || payload.length > MAX_SHARE_PAYLOAD_LENGTH) {
    return null;
  }

  try {
    return architectureSchema.parse(JSON.parse(fromBase64Url(payload)));
  } catch {
    return null;
  }
}
