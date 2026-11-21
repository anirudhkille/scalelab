import { describe, expect, it } from "vitest";

import { architectureSchema } from "../model/schema";
import { MAX_SHARE_PAYLOAD_LENGTH, decodeArchitecture, encodeArchitecture } from "../model/share";

const architecture = architectureSchema.parse({
  schemaVersion: 1,
  nodes: [
    {
      id: "clients",
      label: "Clients",
      position: { x: 0, y: 0 },
      region: "eu-west",
      zone: "b",
      params: { kind: "clients" },
    },
    {
      id: "cache",
      label: "Edge cache",
      position: { x: 240, y: 0 },
      region: "us-east",
      zone: "a",
      params: {
        kind: "cache",
        memoryGb: 16,
        ttlSec: 300,
        evictionPolicy: "lru",
        writeStrategy: "writeBack",
      },
    },
  ],
  edges: [{ id: "edge-clients-cache", source: "clients", target: "cache" }],
});

describe("architecture share links", () => {
  it("round-trips placement and cache strategy", () => {
    const decoded = decodeArchitecture(encodeArchitecture(architecture));

    expect(decoded).toEqual(architecture);
    expect(decoded?.nodes[1]?.region).toBe("us-east");
    expect(decoded?.nodes[1]?.params).toMatchObject({ writeStrategy: "writeBack" });
  });

  it("returns null for malformed payloads", () => {
    expect(decodeArchitecture("")).toBeNull();
    expect(decodeArchitecture("not-a-design")).toBeNull();
    expect(decodeArchitecture("e30")).toBeNull();
  });

  it("rejects oversized query payloads before decoding", () => {
    expect(decodeArchitecture("a".repeat(MAX_SHARE_PAYLOAD_LENGTH + 1))).toBeNull();
  });
});
