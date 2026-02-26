import { z } from "zod"
import { router, publicProcedure } from "../trpc"
import { EnvironmentModel } from "@/server/db/models/EnvironmentModel"
import { spinUpBlaxelSandboxWithCartageAgentWorkflow } from "@/server/workflows/spinUpBlaxelSandboxWithCartageAgentWorkflow"

const DEFAULT_ORG_ID = "default"

export const environmentRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional().default(50),
          offset: z.number().min(0).optional().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { result } = await EnvironmentModel.search({
        orgId: DEFAULT_ORG_ID,
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        filters: {},
      })
      return { environments: result }
    }),

  create: publicProcedure.mutation(async () => {
    return await spinUpBlaxelSandboxWithCartageAgentWorkflow({
      orgId: DEFAULT_ORG_ID,
      createdBy: "anonymous",
    })
  }),
})
