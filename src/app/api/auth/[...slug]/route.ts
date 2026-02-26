import { getRouteHandlers } from "@propelauth/nextjs/server/app-router"
import { NextRequest } from "next/server"

const handlers = getRouteHandlers({
    postLoginRedirectPathFn: () => "/login",
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    const resolvedParams = await params
    const slugPath = resolvedParams.slug.join("/")
    return handlers.getRouteHandler(req, { params: { slug: slugPath } })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    const resolvedParams = await params
    const slugPath = resolvedParams.slug.join("/")
    return handlers.postRouteHandler(req, { params: { slug: slugPath } })
}
