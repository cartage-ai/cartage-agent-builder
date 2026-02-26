import { EnvironmentsUI } from "@/components/EnvironmentsUI"

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Cartage Agent Builder
        </h1>
        <EnvironmentsUI />
      </main>
    </div>
  )
}
