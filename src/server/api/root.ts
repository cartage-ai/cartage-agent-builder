import { router } from "./trpc"
import { environmentRouter } from "./routers/environment.router"
import { authRouter } from "./routers/auth.router"

export const appRouter = router({
    auth: authRouter,
    environment: environmentRouter,
})

export type AppRouter = typeof appRouter
