import Groq from "groq-sdk";
import {
  aiOutputSchemas,
  businessBriefingOutputSchema,
  contactCopilotEvaluationOutputSchema,
  contactCopilotOutputSchema,
} from "./schemas";
import {
  buildBusinessBriefingCorrectiveMessages,
  buildBusinessBriefingMessages,
  buildContactCopilotCorrectiveMessages,
  buildContactCopilotMessages,
  buildCorrectiveMessages,
  buildPromptMessages,
  businessBriefingPromptVersion,
  contactCopilotEvaluatePromptVersion,
  contactCopilotPromptVersion,
  promptVersions,
} from "./prompts";
import {
  AiError,
  type AiInput,
  type AiKind,
  type AiOutput,
  type AiProvider,
  type BusinessBriefingInput,
  type BusinessBriefingOutput,
  type BusinessBriefingResult,
  type ContactCopilotEvaluationOutput,
  type ContactCopilotInput,
  type ContactCopilotReplyOutput,
  type ContactCopilotResult,
} from "./types";

export type ChatCompletionParams = {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  response_format: { type: "json_object" };
  max_tokens: number;
  temperature: number;
};

export type ChatCompletionResult = {
  content: string;
  tokensUsed: number | null;
};

/** Boundary kept minimal so tests stub it without groq-sdk internals. */
export interface ChatCompletionClient {
  complete(params: ChatCompletionParams): Promise<ChatCompletionResult>;
}

export type GroqAiProviderOptions = {
  apiKey: string;
  model: string;
  fallbackModel?: string;
  timeoutMs: number;
  maxTokensByKind: Record<AiKind, number>;
  client?: ChatCompletionClient;
};

export type BusinessBriefingProvider = {
  generate(input: BusinessBriefingInput): Promise<BusinessBriefingResult>;
};

export type GroqBusinessBriefingProviderOptions = {
  apiKey: string;
  model: string;
  fallbackModel?: string;
  timeoutMs: number;
  maxTokens: number;
  client?: ChatCompletionClient;
};

export type ContactCopilotProvider = {
  generate(input: ContactCopilotInput): Promise<ContactCopilotResult>;
};

export type GroqContactCopilotProviderOptions = {
  apiKey: string;
  model: string;
  fallbackModel?: string;
  timeoutMs: number;
  maxTokens: number;
  client?: ChatCompletionClient;
};

function createSdkClient(apiKey: string, timeoutMs: number): ChatCompletionClient {
  const groq = new Groq({ apiKey, timeout: timeoutMs, maxRetries: 0 });
  return {
    async complete(params) {
      const response = await groq.chat.completions.create(params);
      return {
        content: response.choices[0]?.message?.content ?? "",
        tokensUsed: response.usage?.total_tokens ?? null,
      };
    },
  };
}

export function mapProviderError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  const err = error as { status?: number; name?: string; message?: string };
  if (err?.name === "APIConnectionTimeoutError" || /time(d\s?)?out/i.test(err?.message ?? "")) {
    return new AiError("TIMEOUT", "A geração demorou demais e foi cancelada.");
  }
  if (err?.status === 429) {
    return new AiError("RATE_LIMITED", "O provedor de IA está sobrecarregado no momento.");
  }
  return new AiError("PROVIDER_ERROR", "O provedor de IA retornou um erro.");
}

function parseOutput(kind: AiKind, content: string): AiOutput | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  const result = aiOutputSchemas[kind].safeParse(parsed);
  return result.success ? (result.data as AiOutput) : null;
}

function parseBusinessBriefingOutput(content: string): BusinessBriefingOutput | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  const result = businessBriefingOutputSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

function parseContactCopilotReplyOutput(content: string): ContactCopilotReplyOutput | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  const result = contactCopilotOutputSchema.safeParse(parsed);
  return result.success ? (result.data as ContactCopilotReplyOutput) : null;
}

function parseContactCopilotEvaluationOutput(content: string): ContactCopilotEvaluationOutput | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  const result = contactCopilotEvaluationOutputSchema.safeParse(parsed);
  return result.success ? (result.data as ContactCopilotEvaluationOutput) : null;
}

export function createGroqAiProvider(options: GroqAiProviderOptions): AiProvider {
  const client = options.client ?? createSdkClient(options.apiKey, options.timeoutMs);

  async function callModel(
    model: string,
    kind: AiKind,
    messages: ChatCompletionParams["messages"],
  ): Promise<ChatCompletionResult> {
    try {
      return await client.complete({
        model,
        messages,
        response_format: { type: "json_object" },
        max_tokens: options.maxTokensByKind[kind],
        temperature: 0.4,
      });
    } catch (error) {
      throw mapProviderError(error);
    }
  }

  return {
    async generate(kind, input: AiInput) {
      const messages = buildPromptMessages(kind, input);

      let activeModel = options.model;
      let first: ChatCompletionResult;
      try {
        first = await callModel(activeModel, kind, messages);
      } catch (error) {
        const aiError = error as AiError;
        const canFallback =
          options.fallbackModel &&
          options.fallbackModel !== activeModel &&
          (aiError.code === "PROVIDER_ERROR" || aiError.code === "RATE_LIMITED");
        if (!canFallback) throw aiError;
        activeModel = options.fallbackModel as string;
        first = await callModel(activeModel, kind, messages);
      }

      let tokensUsed = first.tokensUsed;
      let output = parseOutput(kind, first.content);

      if (!output) {
        // Single corrective retry with the invalid answer echoed back (specs/13).
        const retry = await callModel(
          activeModel,
          kind,
          buildCorrectiveMessages(kind, input, first.content),
        );
        tokensUsed =
          retry.tokensUsed === null && tokensUsed === null
            ? null
            : (tokensUsed ?? 0) + (retry.tokensUsed ?? 0);
        output = parseOutput(kind, retry.content);
        if (!output) {
          throw new AiError("INVALID_OUTPUT", "A IA não retornou o formato esperado.");
        }
      }

      return {
        output,
        model: activeModel,
        tokensUsed,
        promptVersion: promptVersions[kind],
      };
    },
  };
}

export function createGroqBusinessBriefingProvider(
  options: GroqBusinessBriefingProviderOptions,
): BusinessBriefingProvider {
  const client = options.client ?? createSdkClient(options.apiKey, options.timeoutMs);

  async function callModel(
    model: string,
    messages: ChatCompletionParams["messages"],
  ): Promise<ChatCompletionResult> {
    try {
      return await client.complete({
        model,
        messages,
        response_format: { type: "json_object" },
        max_tokens: options.maxTokens,
        temperature: 0.35,
      });
    } catch (error) {
      throw mapProviderError(error);
    }
  }

  return {
    async generate(input) {
      const messages = buildBusinessBriefingMessages(input);

      let activeModel = options.model;
      let first: ChatCompletionResult;
      try {
        first = await callModel(activeModel, messages);
      } catch (error) {
        const aiError = error as AiError;
        const canFallback =
          options.fallbackModel &&
          options.fallbackModel !== activeModel &&
          (aiError.code === "PROVIDER_ERROR" || aiError.code === "RATE_LIMITED");
        if (!canFallback) throw aiError;
        activeModel = options.fallbackModel as string;
        first = await callModel(activeModel, messages);
      }

      let tokensUsed = first.tokensUsed;
      let output = parseBusinessBriefingOutput(first.content);

      if (!output) {
        const retry = await callModel(
          activeModel,
          buildBusinessBriefingCorrectiveMessages(input, first.content),
        );
        tokensUsed =
          retry.tokensUsed === null && tokensUsed === null
            ? null
            : (tokensUsed ?? 0) + (retry.tokensUsed ?? 0);
        output = parseBusinessBriefingOutput(retry.content);
        if (!output) {
          throw new AiError("INVALID_OUTPUT", "A IA não retornou o formato esperado.");
        }
      }

      return {
        output,
        model: activeModel,
        tokensUsed,
        promptVersion: businessBriefingPromptVersion,
      };
    },
  };
}

export function createGroqContactCopilotProvider(
  options: GroqContactCopilotProviderOptions,
): ContactCopilotProvider {
  const client = options.client ?? createSdkClient(options.apiKey, options.timeoutMs);

  async function callModel(
    model: string,
    messages: ChatCompletionParams["messages"],
  ): Promise<ChatCompletionResult> {
    try {
      return await client.complete({
        model,
        messages,
        response_format: { type: "json_object" },
        max_tokens: options.maxTokens,
        temperature: 0.35,
      });
    } catch (error) {
      throw mapProviderError(error);
    }
  }

  return {
    async generate(input) {
      const messages = buildContactCopilotMessages(input);
      const isEvaluate = input.mode === "evaluate_message";
      const parse = isEvaluate ? parseContactCopilotEvaluationOutput : parseContactCopilotReplyOutput;
      const promptVersion = isEvaluate ? contactCopilotEvaluatePromptVersion : contactCopilotPromptVersion;

      let activeModel = options.model;
      let first: ChatCompletionResult;
      try {
        first = await callModel(activeModel, messages);
      } catch (error) {
        const aiError = error as AiError;
        const canFallback =
          options.fallbackModel &&
          options.fallbackModel !== activeModel &&
          (aiError.code === "PROVIDER_ERROR" || aiError.code === "RATE_LIMITED");
        if (!canFallback) throw aiError;
        activeModel = options.fallbackModel as string;
        first = await callModel(activeModel, messages);
      }

      let tokensUsed = first.tokensUsed;
      let output = parse(first.content);

      if (!output) {
        const retry = await callModel(
          activeModel,
          buildContactCopilotCorrectiveMessages(input, first.content),
        );
        tokensUsed =
          retry.tokensUsed === null && tokensUsed === null
            ? null
            : (tokensUsed ?? 0) + (retry.tokensUsed ?? 0);
        output = parse(retry.content);
        if (!output) {
          throw new AiError("INVALID_OUTPUT", "A IA não retornou o formato esperado.");
        }
      }

      return {
        mode: input.mode,
        output,
        model: activeModel,
        tokensUsed,
        promptVersion,
      } as ContactCopilotResult;
    },
  };
}
