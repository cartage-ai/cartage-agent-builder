/**
 * Thin wrapper around GitHub API (Octokit). No business logic.
 * See cartage-agent src/server/services/CLAUDE.md and GitHubService.
 */
import { XError } from "@/utils/error.utils"
import { getOctokitInstance } from "./utils/gitHubClient.utils"

const getBranchRef = async ({
  owner,
  repo,
  branch,
}: {
  owner: string
  repo: string
  branch: string
}): Promise<{ sha: string }> => {
  try {
    const octokit = getOctokitInstance()
    const ref = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    })
    return { sha: ref.data.object.sha }
  } catch (error) {
    throw new XError({
      message: "GitHubService.getBranchRef: Error getting branch ref",
      cause: error as Error,
      data: { owner, repo, branch },
    })
  }
}

const createBranchRef = async ({
  owner,
  repo,
  branch,
  fromSha,
}: {
  owner: string
  repo: string
  branch: string
  fromSha: string
}): Promise<{ sha: string }> => {
  try {
    const octokit = getOctokitInstance()
    const ref = await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: fromSha,
    })
    return { sha: ref.data.object.sha }
  } catch (error) {
    throw new XError({
      message: "GitHubService.createBranchRef: Error creating branch ref",
      cause: error as Error,
      data: { owner, repo, branch, fromSha },
    })
  }
}

const getBranchFileContent = async ({
  owner,
  repo,
  path,
  branch,
}: {
  owner: string
  repo: string
  path: string
  branch: string
}): Promise<{ content: string; sha: string }> => {
  try {
    const octokit = getOctokitInstance()
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    })
    if (!("content" in response.data)) {
      throw new XError({
        message: "Path is not a file",
        data: { owner, repo, path, branch },
      })
    }
    return {
      content: Buffer.from(response.data.content, "base64").toString("utf-8"),
      sha: response.data.sha,
    }
  } catch (error) {
    throw new XError({
      message:
        "GitHubService.getBranchFileContent: Error getting file content",
      cause: error as Error,
      data: { owner, repo, path, branch },
    })
  }
}

const upsertBranchFileContent = async ({
  owner,
  repo,
  path,
  content,
  message,
  branch,
  sha,
}: {
  owner: string
  repo: string
  path: string
  content: string
  message: string
  branch: string
  sha?: string
}): Promise<void> => {
  try {
    const octokit = getOctokitInstance()
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString("base64"),
      branch,
      sha,
    })
  } catch (error) {
    throw new XError({
      message:
        "GitHubService.upsertBranchFileContent: Error upserting file content",
      cause: error as Error,
      data: { owner, repo, path, branch, sha },
    })
  }
}

const createPullRequest = async ({
  owner,
  repo,
  title,
  body,
  head,
  base,
}: {
  owner: string
  repo: string
  title: string
  body: string
  head: string
  base: string
}): Promise<{ number: number; url: string }> => {
  try {
    const octokit = getOctokitInstance()
    const pr = await octokit.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base,
    })
    return { number: pr.data.number, url: pr.data.html_url ?? "" }
  } catch (error) {
    throw new XError({
      message: "GitHubService.createPullRequest: Error creating PR",
      cause: error as Error,
      data: { owner, repo, title, head, base },
    })
  }
}

const closePullRequest = async ({
  owner,
  repo,
  pullNumber,
}: {
  owner: string
  repo: string
  pullNumber: number
}): Promise<void> => {
  try {
    const octokit = getOctokitInstance()
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: pullNumber,
      state: "closed",
    })
  } catch (error) {
    throw new XError({
      message: "GitHubService.closePullRequest: Error closing PR",
      cause: error as Error,
      data: { owner, repo, pullNumber },
    })
  }
}

const getPullRequestsByCommitSha = async ({
  owner,
  repo,
  commitSha,
}: {
  owner: string
  repo: string
  commitSha: string
}): Promise<Array<{ number: number; title: string }>> => {
  try {
    const octokit = getOctokitInstance()
    const response =
      await octokit.repos.listPullRequestsAssociatedWithCommit({
        owner,
        repo,
        commit_sha: commitSha,
      })
    return response.data.map((pr) => ({
      number: pr.number,
      title: pr.title ?? "",
    }))
  } catch (error) {
    throw new XError({
      message:
        "GitHubService.getPullRequestsByCommitSha: Error getting PRs by commit",
      cause: error as Error,
      data: { owner, repo, commitSha },
    })
  }
}

export const GitHubService = {
  getBranchRef,
  createBranchRef,
  getBranchFileContent,
  upsertBranchFileContent,
  createPullRequest,
  closePullRequest,
  getPullRequestsByCommitSha,
}
