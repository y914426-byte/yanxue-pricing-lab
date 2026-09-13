export class OpenAIError extends Error {
  readonly kind: 'config' | 'http' | 'timeout' | 'response';

  constructor(message: string, kind: 'config' | 'http' | 'timeout' | 'response' = 'response') {
    super(message);
    this.kind = kind;
    this.name = 'OpenAIError';
  }
}

type JsonSchema = Record<string, unknown>;
type OpenAIRequest = {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  userText: string;
  responseSchema: JsonSchema;
  signal: AbortSignal;
  fetchImpl?: typeof fetch;
};

async function readLimitedText(response: Response, maxBytes = 2 * 1024 * 1024) {
  const reader = response.body?.getReader();
  if (!reader) return response.text();
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new OpenAIError('OpenAI 返回内容过大', 'response');
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  return text + decoder.decode();
}

function outputText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  if (typeof root.output_text === 'string') return root.output_text;
  if (!Array.isArray(root.output)) return null;
  for (const item of root.output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === 'object' &&
        (part as Record<string, unknown>).type === 'output_text' &&
        typeof (part as Record<string, unknown>).text === 'string'
      )
        return (part as Record<string, unknown>).text as string;
    }
  }
  return null;
}

export async function callOpenAIJson(request: OpenAIRequest): Promise<unknown> {
  if (!request.apiKey.trim())
    throw new OpenAIError('OPENAI_API_KEY 未配置', 'config');

  const fetchImpl = request.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(request.baseUrl.replace(/\/$/, '') + '/responses', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + request.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: request.systemPrompt }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: request.userText }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'scheme_analysis',
            strict: true,
            schema: request.responseSchema,
          },
        },
      }),
      signal: request.signal,
    });
  } catch (error) {
    if (request.signal.aborted)
      throw new OpenAIError('OpenAI 请求超时', 'timeout');
    throw new OpenAIError(
      error instanceof Error ? error.message : 'OpenAI 请求失败',
      'http',
    );
  }

  const bodyText = await readLimitedText(response);
  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    throw new OpenAIError('OpenAI 返回了非法 JSON', 'response');
  }
  if (!response.ok)
    throw new OpenAIError('OpenAI 服务暂时不可用', 'http');

  const text = outputText(payload);
  if (!text) throw new OpenAIError('OpenAI 未返回分析结果', 'response');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new OpenAIError('AI 返回了非法 JSON', 'response');
  }
}
