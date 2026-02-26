/**
 * Thin wrapper around @blaxel/core SDK. No business logic.
 * See cartage-agent src/server/services/CLAUDE.md.
 */
import { XError } from "@/utils/error.utils"
import {
    SandboxInstance,
    VolumeInstance,
    type SandboxCreateConfiguration,
    type VolumeCreateConfiguration,
    type ProcessRequestWithLog,
    type ProcessResponseWithLog,
} from "@blaxel/core"
import logging from "@/utils/logger.utils"

export type { SandboxCreateConfiguration, VolumeCreateConfiguration }

export type BlaxelSandbox = SandboxInstance

export type BlaxelVolume = VolumeInstance

export type BlaxelProcessRequest = ProcessRequestWithLog

export type BlaxelProcessResponse = ProcessResponseWithLog

export type BlaxelPreviewSpec = {
    port: number
    public: boolean
}

export type BlaxelPreview = {
    metadata: { name: string }
    spec?: { url?: string; port?: number; public?: boolean }
    status?: string
}

/** Create a volume (e.g. for install space). Size in MB. */
const createVolume = async (config: VolumeCreateConfiguration): Promise<BlaxelVolume> => {
    try {
        return await VolumeInstance.create(config)
    } catch (error) {
        throw new XError({
            message: "BlaxelService.createVolume: Error creating volume",
            cause: error as Error,
            data: { config },
        })
    }
}

/** Delete a volume by name. Silently fails if volume doesn't exist. */
const deleteVolume = async (volumeName: string): Promise<void> => {
    try {
        await VolumeInstance.delete(volumeName)
    } catch (error) {
        logging.error(
            `BlaxelService.deleteVolume: Error deleting volume ${volumeName}: ${(error as Error).message}`,
        )
    }
}

const createSandbox = async (config: SandboxCreateConfiguration): Promise<BlaxelSandbox> => {
    try {
        return await SandboxInstance.create(config)
    } catch (error) {
        throw new XError({
            message: "BlaxelService.createSandbox: Error creating sandbox",
            cause: error as Error,
            data: { config },
        })
    }
}

const getSandbox = async (sandboxName: string): Promise<BlaxelSandbox> => {
    try {
        return await SandboxInstance.get(sandboxName)
    } catch (error) {
        throw new XError({
            message: "BlaxelService.getSandbox: Error getting sandbox",
            cause: error as Error,
            data: { sandboxName },
        })
    }
}

/** Delete a sandbox by name. Silently fails if sandbox doesn't exist. */
const deleteSandbox = async (sandboxName: string): Promise<void> => {
    try {
        await SandboxInstance.delete(sandboxName)
    } catch (error) {
        logging.error(
            `BlaxelService.deleteSandbox: Error deleting sandbox ${sandboxName}: ${(error as Error).message}`,
        )
    }
}

const execProcess = async (
    sandbox: BlaxelSandbox,
    processRequest: BlaxelProcessRequest,
): Promise<BlaxelProcessResponse> => {
    try {
        const result = await sandbox.process.exec(processRequest)
        return result as BlaxelProcessResponse
    } catch (error) {
        throw new XError({
            message: "BlaxelService.execProcess: Error executing process in sandbox",
            cause: error as Error,
            data: { sandboxName: sandbox.metadata.name, command: processRequest.command },
        })
    }
}

/**
 * Write a file or directory to the sandbox via the sandbox filesystem API.
 */
const writeFile = async (
    sandbox: BlaxelSandbox,
    path: string,
    content: string,
    options?: { isDirectory?: boolean },
): Promise<{ message: string; path: string }> => {
    try {
        if (options?.isDirectory) {
            // For directories, the SDK doesn't have a specific method, so we use exec
            await sandbox.process.exec({
                command: `mkdir -p ${path}`,
                waitForCompletion: true,
            })
            return { message: "Directory created", path }
        }
        await sandbox.fs.write(path, content)
        return { message: "File written", path }
    } catch (error) {
        throw new XError({
            message: "BlaxelService.writeFile: Error writing file in sandbox",
            cause: error as Error,
            data: { sandboxName: sandbox.metadata.name, path, contentLength: content?.length },
        })
    }
}

const createPreview = async (
    sandbox: BlaxelSandbox,
    spec: BlaxelPreviewSpec,
): Promise<BlaxelPreview> => {
    try {
        const preview = await sandbox.previews.create({
            metadata: { name: "app-preview" },
            spec: { port: spec.port, public: spec.public },
        })
        return {
            metadata: { name: preview.name },
            spec: {
                url: preview.spec?.url,
                port: preview.spec?.port,
                public: preview.spec?.public,
            },
        }
    } catch (error) {
        throw new XError({
            message: "BlaxelService.createPreview: Error creating preview",
            cause: error as Error,
            data: { sandboxName: sandbox.metadata.name, spec },
        })
    }
}

export const BlaxelService = {
    createVolume,
    deleteVolume,
    createSandbox,
    getSandbox,
    deleteSandbox,
    execProcess,
    writeFile,
    createPreview,
}
