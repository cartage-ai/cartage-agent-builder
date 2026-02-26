import { mock } from "bun:test"

export const createMockGitHubService = () => ({
    getBranchRef: mock(() => Promise.resolve({ sha: "mock-sha" })),
    createBranchRef: mock(() => Promise.resolve({ sha: "mock-sha" })),
    getBranchFileContent: mock(() => Promise.resolve({ content: "mock content", sha: "mock-sha" })),
    upsertBranchFileContent: mock(() => Promise.resolve(undefined)),
    createPullRequest: mock(() =>
        Promise.resolve({ number: 1, url: "https://github.com/mock/pr/1" }),
    ),
    closePullRequest: mock(() => Promise.resolve(undefined)),
    getPullRequestsByCommitSha: mock(() => Promise.resolve([])),
})
