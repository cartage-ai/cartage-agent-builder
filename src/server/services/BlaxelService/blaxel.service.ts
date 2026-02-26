/**
 * Thin wrapper around Blaxel Control Plane and Sandbox Process APIs. No business logic.
 * See cartage-agent src/server/services/CLAUDE.md.
 */
import { XError } from "@/utils/error.utils";
import {
  BL_CONTROL_PLANE_BASE,
  getBlaxelAuthHeaders,
  getBlaxelWorkspace,
} from "./utils/blaxelAuth.utils";

export type BlaxelVolumeAttachment = {
  name: string;
  mountPath: string;
  readOnly?: boolean;
};

export type BlaxelSandboxSpec = {
  metadata: { name: string };
  spec: {
    runtime: {
      image: string;
      memory?: number;
      ports?: Array<{ target: number }>;
      ttl?: string;
    };
    region?: string;
    volumes?: BlaxelVolumeAttachment[];
  };
};

export type BlaxelSandbox = {
  metadata: {
    name: string;
    workspace?: string;
    url?: string;
  };
  spec?: BlaxelSandboxSpec["spec"];
  status?: string;
};

export type BlaxelProcessRequest = {
  command: string;
  name?: string;
  workingDir?: string;
  env?: Record<string, string>;
  timeout?: number;
  waitForCompletion?: boolean;
  waitForPorts?: number[];
};

export type BlaxelProcessResponse = {
  exitCode: number;
  stdout?: string;
  stderr?: string;
  logs?: string;
  status?: string;
};

export type BlaxelPreviewSpec = {
  port: number;
  public: boolean;
};

export type BlaxelPreview = {
  metadata: { name: string };
  spec?: { url?: string; port?: number; public?: boolean };
  status?: string;
};

/** Create a volume (e.g. for install space). Size in MB. */
const createVolume = async (
  name: string,
  sizeMb: number,
  region?: string,
): Promise<{
  metadata: { name: string };
  spec: { size: number; region?: string };
}> => {
  try {
    const body: {
      metadata: { name: string };
      spec: { size: number; region?: string };
    } = {
      metadata: { name },
      spec: { size: sizeMb },
    };
    if (region) body.spec.region = region;
    const res = await fetch(`${BL_CONTROL_PLANE_BASE}/volumes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Blaxel-Workspace": getBlaxelWorkspace(),
        ...getBlaxelAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Blaxel createVolume ${res.status}: ${text}`);
    }
    return (await res.json()) as {
      metadata: { name: string };
      spec: { size: number; region?: string };
    };
  } catch (error) {
    throw new XError({
      message: "BlaxelService.createVolume: Error creating volume",
      cause: error as Error,
      data: { name, sizeMb },
    });
  }
};

const createSandbox = async (
  spec: BlaxelSandboxSpec,
): Promise<BlaxelSandbox> => {
  try {
    const res = await fetch(`${BL_CONTROL_PLANE_BASE}/sandboxes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Blaxel-Workspace": getBlaxelWorkspace(),
        ...getBlaxelAuthHeaders(),
      },
      body: JSON.stringify(spec),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Blaxel createSandbox ${res.status}: ${body}`);
    }
    return (await res.json()) as BlaxelSandbox;
  } catch (error) {
    throw new XError({
      message: "BlaxelService.createSandbox: Error creating sandbox",
      cause: error as Error,
      data: { spec },
    });
  }
};

const getSandbox = async (sandboxName: string): Promise<BlaxelSandbox> => {
  try {
    const res = await fetch(
      `${BL_CONTROL_PLANE_BASE}/sandboxes/${encodeURIComponent(sandboxName)}`,
      {
        method: "GET",
        headers: {
          "X-Blaxel-Workspace": getBlaxelWorkspace(),
          ...getBlaxelAuthHeaders(),
        },
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Blaxel getSandbox ${res.status}: ${body}`);
    }
    return (await res.json()) as BlaxelSandbox;
  } catch (error) {
    throw new XError({
      message: "BlaxelService.getSandbox: Error getting sandbox",
      cause: error as Error,
      data: { sandboxName },
    });
  }
};

const execProcess = async (
  sandboxBaseUrl: string,
  processRequest: BlaxelProcessRequest,
): Promise<BlaxelProcessResponse> => {
  try {
    const url = sandboxBaseUrl.replace(/\/$/, "") + "/process";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Blaxel-Workspace": getBlaxelWorkspace(),
        ...getBlaxelAuthHeaders(),
      },
      body: JSON.stringify(processRequest),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Blaxel execProcess ${res.status}: ${body}`);
    }
    return (await res.json()) as BlaxelProcessResponse;
  } catch (error) {
    throw new XError({
      message: "BlaxelService.execProcess: Error executing process in sandbox",
      cause: error as Error,
      data: { sandboxBaseUrl, command: processRequest.command },
    });
  }
};

/**
 * Write a file or directory to the sandbox via the sandbox filesystem API.
 * sandboxBaseUrl is the sandbox API URL (e.g. metadata.url from getSandbox).
 */
const writeFile = async (
  sandboxBaseUrl: string,
  path: string,
  content: string,
  options?: { isDirectory?: boolean },
): Promise<{ message: string; path: string }> => {
  try {
    const url =
      sandboxBaseUrl.replace(/\/$/, "") +
      "/filesystem/" +
      encodeURIComponent(path.startsWith("/") ? path : "/" + path);
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Blaxel-Workspace": getBlaxelWorkspace(),
        ...getBlaxelAuthHeaders(),
      },
      body: JSON.stringify({
        content: options?.isDirectory ? "" : content,
        isDirectory: options?.isDirectory ?? false,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Blaxel writeFile ${res.status}: ${body}`);
    }
    return (await res.json()) as { message: string; path: string };
  } catch (error) {
    throw new XError({
      message: "BlaxelService.writeFile: Error writing file in sandbox",
      cause: error as Error,
      data: { sandboxBaseUrl, path, contentLength: content?.length },
    });
  }
};

const createPreview = async (
  sandboxName: string,
  spec: BlaxelPreviewSpec,
): Promise<BlaxelPreview> => {
  try {
    const res = await fetch(
      `${BL_CONTROL_PLANE_BASE}/sandboxes/${encodeURIComponent(sandboxName)}/previews`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Blaxel-Workspace": getBlaxelWorkspace(),
          ...getBlaxelAuthHeaders(),
        },
        body: JSON.stringify({
          metadata: { name: "app-preview" },
          spec: { port: spec.port, public: spec.public },
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Blaxel createPreview ${res.status}: ${body}`);
    }
    return (await res.json()) as BlaxelPreview;
  } catch (error) {
    throw new XError({
      message: "BlaxelService.createPreview: Error creating preview",
      cause: error as Error,
      data: { sandboxName, spec },
    });
  }
};

export const BlaxelService = {
  createVolume,
  createSandbox,
  getSandbox,
  execProcess,
  writeFile,
  createPreview,
};
