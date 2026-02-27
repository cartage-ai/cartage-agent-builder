import { z } from "zod"
import { protectedProcedure, publicProcedure, router } from "../trpc"
import { authLoginWorkflow } from "@/server/workflows/authLoginWorkflow"

export const authRouter = router({
    authLogin: publicProcedure
        .input(z.object({ accessToken: z.string() }))
        .mutation(async ({ input }) => {
            return await authLoginWorkflow({ accessToken: input.accessToken })
        }),

    validate: protectedProcedure.mutation(() => ({ ok: true })),
})
