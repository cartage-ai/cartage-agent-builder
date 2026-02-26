import { Octokit } from "@octokit/rest"

let octokitInstance: Octokit | null = null

export function getOctokitInstance(): Octokit {
  if (!octokitInstance) {
    octokitInstance = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })
  }
  return octokitInstance
}
