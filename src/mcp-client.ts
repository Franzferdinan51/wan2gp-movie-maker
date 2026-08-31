/**
 * MCP Streamable HTTP client for the wan2gp-mcp server.
 *
 * Talks the Streamable HTTP transport from the 2025-06-18 MCP spec:
 *   POST <endpoint> with JSON-RPC body
 *   responses are application/json OR text/event-stream
 *
 * We don't use the official SDK to keep this dependency-light and to
 * avoid baking in any vendor transport choices.
 */

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: any;
}

export interface McpToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

export class McpClient {
  private nextId = 1;
  private sessionId: string | null = null;
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint.replace(/\/$/, '');
  }

  /** Send a JSON-RPC request and return the result. */
  private async request(method: string, params?: any): Promise<any> {
    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: this.nextId++,
      method,
      params,
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const sessionHeader = res.headers.get('Mcp-Session-Id');
    if (sessionHeader) this.sessionId = sessionHeader;

    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('text/event-stream')) {
      // Parse SSE — collect data: lines, parse the last one.
      const text = await res.text();
      const events = text
        .split(/\r?\n\r?\n/)
        .map((e) => e.trim())
        .filter(Boolean);
      for (const evt of events.reverse()) {
        const dataLine = evt
          .split(/\r?\n/)
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trim())
          .join('\n');
        if (dataLine) {
          try {
            const parsed = JSON.parse(dataLine) as JsonRpcResponse;
            if (parsed.error) throw new Error(parsed.error.message);
            return parsed.result;
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }
      throw new Error('SSE stream contained no JSON-RPC frame');
    }

    const parsed = (await res.json()) as JsonRpcResponse;
    if (parsed.error) throw new Error(parsed.error.message);
    return parsed.result;
  }

  /** Initialize a session and list available tools. */
  async listTools(): Promise<ToolDef[]> {
    await this.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'wan2gp-movie-maker', version: '0.1.0' },
    });
    const { tools } = await this.request('tools/list', {});
    return tools;
  }

  /** Invoke a named tool. */
  async callTool(name: string, args: Record<string, any>): Promise<McpToolResult> {
    return this.request('tools/call', { name, arguments: args });
  }

  /** Parse the typical `[{type:'text', text:'<json>'}]` response into JSON. */
  async callToolJSON<T = any>(name: string, args: Record<string, any>): Promise<T> {
    const result = await this.callTool(name, args);
    if (result.isError) {
      throw new Error(result.content[0]?.text ?? 'tool call failed');
    }
    try {
      return JSON.parse(result.content[0].text) as T;
    } catch {
      // tool may return raw text
      return result.content[0].text as any;
    }
  }

  close() {
    // stateless for now — close handled by GC
  }
}

// --------------------------------------------------------------------
// Typed wrappers for the wan2gp-mcp tool surface.
// Each one returns the parsed JSON payload the tool produces. Use these
// instead of raw callToolJSON so call sites stay typed.
// --------------------------------------------------------------------

/** h3_status — current model, GPU state, current job, history count. */
export interface H3Status {
  model: string;
  text_encoder: string;
  text_encoder_default_variant?: string;
  text_encoder_variants?: string[];
  repo_root: string;
  output_dir: string;
  current_job: { job_id: string; status: string; step: number } | null;
  history_count: number;
  note?: string;
}
export function h3Status(client: McpClient): Promise<H3Status> {
  return client.callToolJSON<H3Status>('h3_status', {});
}

/** h3_list_jobs — current + recent history. */
export interface H3JobSummary {
  job_id: string;
  status: string;
  step: number;
  total_steps: number;
  elapsed_seconds: number;
  started_at: string;
  finished_at: string | null;
  video_path: string | null;
  audio_path: string | null;
  muxed_path: string | null;
  error: string | null;
}
export function h3ListJobs(client: McpClient, limit = 20): Promise<H3JobSummary[]> {
  return client.callToolJSON<H3JobSummary[]>('h3_list_jobs', { limit });
}

/** h3_list_outputs — every MP4/WAV on disk, most-recent first. */
export interface H3Output {
  path: string;
  size_bytes: number;
  mtime: number;
}
export function h3ListOutputs(client: McpClient, limit = 50): Promise<H3Output[]> {
  return client.callToolJSON<H3Output[]>('h3_list_outputs', { limit });
}

/** h3_get_video — return base64 of an MP4 (capped at 50 MB inline). */
export interface H3GetVideoResult {
  content: { type: 'video'; data: string; mimeType: string }[];
  base64?: string;
  path: string;
  size_bytes: number;
}
export function h3GetVideo(
  client: McpClient,
  path: string,
  max_bytes = 50 * 1024 * 1024,
): Promise<H3GetVideoResult> {
  return client.callToolJSON<H3GetVideoResult>('h3_get_video', { path, max_bytes });
}

/** h3_get_default_settings — the defaults the MCP server uses. */
export interface H3DefaultSettings {
  architecture: string;
  duration_seconds: number;
  height: number;
  width: number;
  sampling_steps: number;
  seed: number;
  text_encoder_variant: string;
}
export function h3GetDefaultSettings(client: McpClient): Promise<H3DefaultSettings> {
  return client.callToolJSON<H3DefaultSettings>('h3_get_default_settings', {});
}