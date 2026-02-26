/**
 * Pure utils for authLoginWorkflow.
 */
import jwt from "jsonwebtoken"

const ALLOWED_EMAIL_DOMAIN = "@cartage.ai"
const SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 7 // 7 days

export type SessionPayload = {
    userId: string
    email: string
}

export const isCartageEmail = (email: string): boolean => email.endsWith(ALLOWED_EMAIL_DOMAIN)

export const signSessionToken = (payload: SessionPayload): string => {
    const secret = process.env.SESSION_SECRET
    if (!secret) throw new Error("SESSION_SECRET is not set")
    return jwt.sign(payload, secret, { expiresIn: SESSION_EXPIRY_SECONDS })
}

export const verifySessionToken = (token: string): SessionPayload | null => {
    const secret = process.env.SESSION_SECRET
    if (!secret) return null
    try {
        return jwt.verify(token, secret) as SessionPayload
    } catch {
        return null
    }
}
