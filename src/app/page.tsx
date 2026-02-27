"use client"

import { useRouter } from "next/navigation"
import { EnvironmentsUI } from "@/components/EnvironmentsUI"

export default function Home() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Cartage Agent Builder
                    </h1>
                    <button
                        type="button"
                        onClick={() => router.push("/logout")}
                        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                        Log out
                    </button>
                </div>
                <EnvironmentsUI />
            </main>
        </div>
    )
}
