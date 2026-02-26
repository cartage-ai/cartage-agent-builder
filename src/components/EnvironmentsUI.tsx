"use client"

import { api } from "@/utils/api"

export function EnvironmentsUI() {
  const utils = api.useUtils()
  const { data, isLoading, error } = api.environment.list.useQuery()
  const createMutation = api.environment.create.useMutation({
    onSuccess: () => {
      void utils.environment.list.invalidate()
    },
  })

  const environments = data?.environments ?? []
  const errorMessage =
    error?.message ?? (createMutation.error?.message ?? null)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {createMutation.isPending ? "Spinning up…" : "New environment"}
        </button>
      </div>

      {(errorMessage || createMutation.isError) && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium text-zinc-800 dark:text-zinc-200">
          My environments
        </h2>
        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : environments.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No environments yet. Click “New environment” to spin up a Blaxel sandbox with the Cartage Agent repo and a live preview.
          </p>
        ) : (
          <ul className="space-y-3">
            {environments.map((env) => (
              <li
                key={env.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {env.sandboxName}
                  </span>
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {env.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <a
                    href={env.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Open preview
                  </a>
                  <a
                    href={env.sandboxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-600 hover:underline dark:text-zinc-400"
                  >
                    Sandbox URL
                  </a>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {new Date(env.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
