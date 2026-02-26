import { mock } from "bun:test"
import type { SandboxInstance, VolumeInstance } from "@blaxel/core"

const createMockSandbox = (): SandboxInstance =>
    ({
        metadata: { name: "mock-sandbox", url: "https://mock-sandbox.blaxel.ai" },
        status: "DEPLOYED",
        spec: { runtime: { image: "mock-image", memory: 8192 } },
        events: undefined,
        lastUsedAt: undefined,
        expiresIn: undefined,
        fs: {
            read: mock(() => Promise.resolve({ content: "mock content", path: "/mock/path" })),
            write: mock(() => Promise.resolve({ message: "ok", path: "/mock/path" })),
        } as unknown as SandboxInstance["fs"],
        network: {} as SandboxInstance["network"],
        process: {
            exec: mock(() => Promise.resolve({ exitCode: 0, stdout: "mock stdout", stderr: "" })),
        } as unknown as SandboxInstance["process"],
        previews: {
            create: mock(() =>
                Promise.resolve({
                    name: "app-preview",
                    metadata: { name: "app-preview" },
                    spec: { url: "https://mock-preview.blaxel.ai", port: 3000, public: true },
                }),
            ),
        } as unknown as SandboxInstance["previews"],
        sessions: {} as SandboxInstance["sessions"],
        codegen: {} as SandboxInstance["codegen"],
        system: {} as SandboxInstance["system"],
        wait: mock(() => Promise.resolve({} as SandboxInstance)),
        delete: mock(() => Promise.resolve({})),
    }) as unknown as SandboxInstance

const createMockVolume = (): VolumeInstance =>
    ({
        metadata: { name: "mock-volume" },
        spec: { size: 1024 },
        status: "active",
        name: "mock-volume",
        displayName: "Mock Volume",
        size: 1024,
        region: "us-west-1",
        delete: mock(() => Promise.resolve({})),
        update: mock(() => Promise.resolve({} as VolumeInstance)),
    }) as unknown as VolumeInstance

export const createMockBlaxelService = () => ({
    createVolume: mock(() => Promise.resolve(createMockVolume())),
    deleteVolume: mock(() => Promise.resolve()),
    createSandbox: mock(() => Promise.resolve(createMockSandbox())),
    getSandbox: mock(() => Promise.resolve(createMockSandbox())),
    deleteSandbox: mock(() => Promise.resolve()),
    execProcess: mock(() =>
        Promise.resolve({
            exitCode: 0,
            stdout: "mock stdout",
            stderr: "",
            command: "mock-command",
            completedAt: new Date().toISOString(),
            logs: "",
            name: "mock-process",
            startedAt: new Date().toISOString(),
            status: "completed" as const,
            workingDir: "/",
            pid: "1",
            close: () => {},
        }),
    ),
    writeFile: mock(() => Promise.resolve({ message: "ok", path: "/mock/path" })),
    createPreview: mock(() =>
        Promise.resolve({
            metadata: { name: "app-preview" },
            spec: { url: "https://mock-preview.blaxel.ai", port: 3000, public: true },
        }),
    ),
})
