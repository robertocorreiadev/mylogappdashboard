import crypto from "crypto"

const SCRYPT_KEYLEN = 64

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex")
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":")

  if (parts.length === 3 && parts[0] === "scrypt") {
    const [, salt, hash] = parts
    const hashBuf = Buffer.from(hash, "hex")
    const testBuf = crypto.scryptSync(password, salt, SCRYPT_KEYLEN)
    return hashBuf.length === testBuf.length && crypto.timingSafeEqual(hashBuf, testBuf)
  }

  // Formato legado (HMAC-SHA256), usado por contas criadas antes da migração para scrypt.
  if (parts.length === 2) {
    const [salt, hash] = parts
    const expectedBuf = Buffer.from(crypto.createHmac("sha256", salt).update(password).digest("hex"), "hex")
    const hashBuf = Buffer.from(hash, "hex")
    return hashBuf.length === expectedBuf.length && crypto.timingSafeEqual(hashBuf, expectedBuf)
  }

  return false
}

export function isLegacyHash(stored: string): boolean {
  return stored.split(":").length === 2
}

export function isAdminEmail(email: string): boolean {
  return !!process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
}
