import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken, generateTestKey } from "@/lib/token-crypto";

describe("token-crypto", () => {
  it("round-trips a plaintext token", () => {
    const key = generateTestKey();
    const plaintext = "IGQVJYbogus-access-token-value";
    const encrypted = encryptToken(plaintext, key);
    expect(decryptToken(encrypted, key)).toBe(plaintext);
  });

  it("never stores the plaintext inside the ciphertext", () => {
    const key = generateTestKey();
    const plaintext = "IGQVJYbogus-access-token-value";
    const encrypted = encryptToken(plaintext, key);
    expect(encrypted.ciphertext).not.toContain(plaintext);
    expect(encrypted.ciphertext.includes("bogus")).toBe(false);
  });

  it("fails to decrypt with the wrong key", () => {
    const key = generateTestKey();
    const wrongKey = generateTestKey();
    const encrypted = encryptToken("secret-token", key);
    expect(() => decryptToken(encrypted, wrongKey)).toThrow();
  });

  it("fails to decrypt if the ciphertext is tampered with", () => {
    const key = generateTestKey();
    const encrypted = encryptToken("secret-token", key);
    const tampered = {
      ...encrypted,
      ciphertext: Buffer.from("tampered-value-that-is-long-enough").toString("base64"),
    };
    expect(() => decryptToken(tampered, key)).toThrow();
  });

  it("fails to decrypt if the auth tag is tampered with", () => {
    const key = generateTestKey();
    const encrypted = encryptToken("secret-token", key);
    const flippedTag = Buffer.from(encrypted.authTag, "base64");
    flippedTag[0] ^= 0xff;
    expect(() => decryptToken({ ...encrypted, authTag: flippedTag.toString("base64") }, key)).toThrow();
  });

  it("produces different ciphertext/iv for repeated encryptions of the same plaintext", () => {
    const key = generateTestKey();
    const a = encryptToken("same-token", key);
    const b = encryptToken("same-token", key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("throws a clear error when TOKEN_ENCRYPTION_KEY is missing", () => {
    const original = process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken("x")).toThrow(/TOKEN_ENCRYPTION_KEY/);
    if (original) process.env.TOKEN_ENCRYPTION_KEY = original;
  });
});
