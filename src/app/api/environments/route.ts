import { NextResponse } from "next/server"
import { spinUpBlaxelSandboxWithCartageAgentWorkflow } from "@/server/workflows/spinUpBlaxelSandboxWithCartageAgentWorkflow"
import { EnvironmentModel } from "@/server/db/models/EnvironmentModel"
import { XError } from "@/utils/error.utils"

const DEFAULT_ORG_ID = "default"

export async function GET() {
  try {
    const { result } = await EnvironmentModel.search({
      orgId: DEFAULT_ORG_ID,
      limit: 50,
      offset: 0,
      filters: {},
    })
    return NextResponse.json({ environments: result })
  } catch (error) {
    if (error instanceof XError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "List failed" },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const result =
      await spinUpBlaxelSandboxWithCartageAgentWorkflow({
        orgId: DEFAULT_ORG_ID,
        createdBy: "anonymous",
      })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof XError) {
      const message =
        error.cause instanceof Error ? error.cause.message : error.message
      return NextResponse.json(
        { error: message, code: error.code },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 500 }
    )
  }
}
