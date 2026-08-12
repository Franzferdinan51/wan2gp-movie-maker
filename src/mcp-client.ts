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