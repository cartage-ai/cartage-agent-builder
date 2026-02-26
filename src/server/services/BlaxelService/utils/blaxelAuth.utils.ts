import { XError } from "@/utils/error.utils"

export const BL_CONTROL_PLANE_BASE = "https://api.blaxel.ai/v0"

let authHeaders: { Authorization: string } | null = null

export function getBlaxelAuthHeaders(): { Authorization: string } {
    if (!authHeaders) {
        const key = process.env.BL_API_KEY
        if (!key) {
            throw new XError({
                message: "BlaxelService: BL_API_KEY is not set",
                code: "BLAXEL_CONFIG_ERROR",
            })
        }
        authHeaders = { Authorization: `Bearer ${key}` }
    }
    return authHeaders
}

export function getBlaxelWorkspace(): string {
    const workspace = process.env.BL_WORKSPACE
    if (!workspace) {
        throw new XError({
            message: "BlaxelService: BL_WORKSPACE is required (set in env or Secret Manager)",
            code: "BLAXEL_CONFIG_ERROR",
        })
    }
    return workspace
}
