/**
 * Schema for internal User model (cartage.ai employees only).
 */
import { z } from "zod"

export const UserSchema = z.object({
    id: z.string(),
    propelAuthUserId: z.string(),
    email: z.string().email(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
})

export type User = z.infer<typeof UserSchema>
