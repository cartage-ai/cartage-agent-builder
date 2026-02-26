import { router } from "./trpc"
import { environmentRouter } from "./routers/environment.router"

export const appRouter = router({
  environment: environmentRouter,
})

export type AppRouter = typeof appRouter
