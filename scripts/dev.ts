#!/usr/bin/env bun
/**
 * Development server: load secrets from GCP Secret Manager, then run Next.js dev.
 * Uses Application Default Credentials (run: gcloud auth application-default login).
 *
 *   bun run scripts/dev.ts   # or: bun dev (if package.json "dev" points here)
 */

import { SecretService } from "../src/server/services/SecretService"
import { spawn } from "child_process"

async function startDevServer() {
    console.log("🔧 Loading secrets from Secret Manager...")

    try {
        const secrets = await SecretService.getSecrets()
        console.log(`✅ Loaded ${Object.keys(secrets).length} secrets`)

        const env = {
            ...secrets,
            ...process.env,
        }

        console.log("🚀 Starting Next.js dev server (Bun runtime)...")

        const nextDev = spawn("bun", ["--bun", "next", "dev", "-p", "3001"], {
            stdio: "inherit",
            env,
        })

        process.on("SIGINT", () => nextDev.kill("SIGINT"))
        process.on("SIGTERM", () => nextDev.kill("SIGTERM"))

        nextDev.on("exit", (code) => {
            process.exit(code ?? 0)
        })
    } catch (error) {
        console.error("❌ Failed to load secrets:", error)
        console.warn("⚠️  Starting dev server without secrets...")
        const nextDev = spawn("bun", ["--bun", "next", "dev", "-p", "3001"], {
            stdio: "inherit",
        })
        process.on("SIGINT", () => nextDev.kill("SIGINT"))
        process.on("SIGTERM", () => nextDev.kill("SIGTERM"))
        nextDev.on("exit", (code) => process.exit(code ?? 0))
    }
}

startDevServer()
