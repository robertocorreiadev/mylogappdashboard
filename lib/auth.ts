import crypto from "crypto"

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.createHmac("sha256", salt).update(password).digest("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  return crypto.createHmac("sha256", salt).update(password).digest("hex") === hash
}
