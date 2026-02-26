import { z } from "zod"
import { router, publicProcedure } from "../trpc"
import { EnvironmentModel } from "@/server/db/models/EnvironmentModel"
import { spinUpBlaxelSandboxWithCartageAgentWorkflow } from "@/server/workflows/spinUpBlaxelSandboxWithCartageAgentWorkflow"
import { BlaxelService } from "@/server/services/BlaxelService"
import logging from "@/utils/logger.utils"

const DEFAULT_ORG_ID = "default"

export const environmentRouter = router({
    list: publicProcedure
        .input(
            z
                .object({
                    limit: z.number().min(1).max(100).optional().default(50),
                    offset: z.number().min(0).optional().default(0),
                })
                .optional(),
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

    delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
        // Get environment to retrieve sandbox name
        const environment = await EnvironmentModel.getById(input.id)
        if (!environment) {
            logging.error(`Environment not found for deletion: ${input.id}`)
            return { success: false, message: "Environment not found" }
        }

        // Delete Blaxel sandbox (silently fails if doesn't exist)
        await BlaxelService.deleteSandbox(environment.sandboxName)

        // Delete Firestore record (throws if not found, but we already checked above)
        await EnvironmentModel.deleteById(input.id)

        return { success: true }
    }),
})
