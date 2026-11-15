import { GoogleGenAI, FunctionDeclaration, ThinkingLevel } from '@google/genai';
import { recordAiSystemEvent } from '../../db/aiQueries.ts';

export const GEMINI_MODEL = 'gemini-4-hydrogen';

export interface GeminiToolExecutionResult {
  usedGemini: boolean;
  text: string;
  tokensUsed: number;
  toolTrace: Array<{
    tool: string;
    args: any;
    resultSummary: string;
    ok: boolean;
  }>;
  fallbackReason?: string;
}

export function getGeminiIntegrationStatus() {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  const isConfigured = key.length > 10 && !key.includes('YOUR_');
  return {
    provider: 'Google Gemini Server-Side SDK (@google/genai)',
    model: GEMINI_MODEL,
    configured: isConfigured,
    status: isConfigured ? ('CONNECTED' as const) : ('CONFIG_REQUIRED' as const),
    message: isConfigured
      ? 'Server-side Gemini reasoning engine active.'
      : 'GEMINI_API_KEY secret is not configured in server environment. Running deterministic PostgreSQL tool orchestration fallback.',
  };
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('YOUR_')) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withExponentialRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  baseDelayMs = 450
): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || err);
      const isTransient =
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('timeout');
      if (!isTransient || attempt === retries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, baseDelayMs * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

/**
 * Executes a Gemini 4 tool-calling loop strictly server-side with function declarations
 * and records real token usage telemetry into PostgreSQL ai_system_events.
 */
export async function runGeminiWithTools(params: {
  systemInstruction: string;
  prompt: string;
  declarations: FunctionDeclaration[];
  executeTool: (name: string, args: Record<string, any>) => Promise<{ ok: boolean; data: any; summary: string }>;
  source: string;
  maxIterations?: number;
}): Promise<GeminiToolExecutionResult> {
  const ai = createGeminiClient();
  if (!ai) {
    return {
      usedGemini: false,
      text: '',
      tokensUsed: 0,
      toolTrace: [],
      fallbackReason: 'GEMINI_API_KEY missing or unconfigured',
    };
  }

  const maxIterations = params.maxIterations ?? 5;
  const toolTrace: GeminiToolExecutionResult['toolTrace'] = [];
  let totalTokensUsed = 0;

  const contents: Array<{ role: 'user' | 'model' | 'tool'; parts: any[] }> = [
    { role: 'user', parts: [{ text: params.prompt }] },
  ];

  try {
    for (let iter = 0; iter < maxIterations; iter++) {
      const response = await withExponentialRetry(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: contents as any,
          config: {
            systemInstruction: params.systemInstruction,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
            tools: params.declarations.length > 0 ? [{ functionDeclarations: params.declarations }] : undefined,
          },
        })
      );

      const usage = (response as any)?.usageMetadata;
      if (usage?.totalTokenCount) {
        totalTokensUsed += Number(usage.totalTokenCount) || 0;
      }

      const functionCalls = (response as any)?.functionCalls;
      if (Array.isArray(functionCalls) && functionCalls.length > 0) {
        const modelParts = (response as any)?.candidates?.[0]?.content?.parts || [];
        contents.push({
          role: 'model',
          parts: modelParts.length > 0
            ? modelParts
            : functionCalls.map((fc: any) => ({ functionCall: fc })),
        });

        const responseParts: any[] = [];
        for (const call of functionCalls) {
          const toolName = String(call.name || '');
          const toolArgs = (call.args && typeof call.args === 'object' ? call.args : {}) as Record<string, any>;
          const execRes = await params.executeTool(toolName, toolArgs);
          toolTrace.push({
            tool: toolName,
            args: toolArgs,
            resultSummary: execRes.summary,
            ok: execRes.ok,
          });
          responseParts.push({
            functionResponse: {
              name: toolName,
              response: execRes.ok ? { result: execRes.data } : { error: execRes.data },
            },
          });
        }

        contents.push({
          role: 'user',
          parts: responseParts,
        });
        continue;
      }

      const finalText = (response.text || '').trim();
      if (totalTokensUsed > 0) {
        await recordAiSystemEvent({
          eventType: 'GEMINI_TOKEN_USAGE',
          severity: 'INFO',
          source: params.source,
          summary: `Gemini (${GEMINI_MODEL}) executed cleanly (${totalTokensUsed} tokens, ${toolTrace.length} tool calls).`,
          details: { model: GEMINI_MODEL, tokensUsed: totalTokensUsed, tools: toolTrace.map(t => t.tool) },
          resolved: true,
          tokensUsed: totalTokensUsed,
        }).catch(() => {});
      }

      return {
        usedGemini: true,
        text: finalText || 'Completed reasoning and backend tool execution.',
        tokensUsed: totalTokensUsed,
        toolTrace,
      };
    }

    return {
      usedGemini: true,
      text: 'Execution reached maximum tool-calling iterations cleanly.',
      tokensUsed: totalTokensUsed,
      toolTrace,
    };
  } catch (err: any) {
    console.warn('Gemini execution error (switching to verified deterministic orchestrator):', err?.message || err);
    await recordAiSystemEvent({
      eventType: 'GEMINI_API_FALLBACK',
      severity: 'WARNING',
      source: params.source,
      summary: `Gemini API transient/auth notice: ${String(err?.message || err).slice(0, 220)}`,
      details: { model: GEMINI_MODEL },
      resolved: false,
      tokensUsed: totalTokensUsed,
    }).catch(() => {});

    return {
      usedGemini: false,
      text: '',
      tokensUsed: totalTokensUsed,
      toolTrace,
      fallbackReason: String(err?.message || err),
    };
  }
}
