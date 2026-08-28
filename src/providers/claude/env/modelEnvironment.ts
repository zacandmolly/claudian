import { joinEnvironmentTexts } from '../../../core/providers/providerEnvironment';
import { createRuntimeInputFingerprint } from '../../../core/providers/settings/RuntimeInputFingerprint';
import type { EnvSnippet } from '../../../core/types/settings';
import { parseEnvironmentVariables } from '../../../utils/env';
import { toClaudeRuntimeModelId } from '../modelSelection';

function normalizeModelId(model: string): string {
  return toClaudeRuntimeModelId(model).trim().toLowerCase();
}

function withoutContextMarker(model: string): string {
  return normalizeModelId(model).replace(/\[1m\]$/, '');
}

function getModelParts(model: string): { provider: string; slug: string } {
  const normalized = withoutContextMarker(model);
  const parts = normalized.split('/');
  return parts.length > 1
    ? { provider: parts[0], slug: parts.slice(1).join('/') }
    : { provider: '', slug: normalized };
}

export function isDeepSeekClaudeModel(model: string): boolean {
  const { provider, slug } = getModelParts(model);
  return provider === 'deepseek' || slug.includes('deepseek');
}

export function isKimiClaudeModel(model: string): boolean {
  const { provider, slug } = getModelParts(model);
  return provider === 'moonshotai' || slug.startsWith('kimi-');
}

export function isOpenRouterClaudeModel(model: string): boolean {
  const { provider, slug } = getModelParts(model);
  return provider === 'openrouter'
    || provider === '~anthropic'
    || (provider === 'anthropic' && slug.startsWith('claude-'));
}

export function usesModelScopedClaudeEnvironment(model: string): boolean {
  return isDeepSeekClaudeModel(model)
    || isKimiClaudeModel(model)
    || isOpenRouterClaudeModel(model);
}

/** `[1m]` is Claudian metadata, not part of a DeepSeek API model id. */
export function normalizeClaudeRuntimeModelId(model: string): string {
  const runtimeModel = toClaudeRuntimeModelId(model).trim();
  return isDeepSeekClaudeModel(runtimeModel)
    ? runtimeModel.replace(/\[1m\]$/i, '')
    : runtimeModel;
}

function isClaudeSnippet(snippet: EnvSnippet): boolean {
  return !snippet.scope || snippet.scope === 'provider:claude';
}

function findRouteSnippet(
  snippets: readonly EnvSnippet[],
  model: string,
): EnvSnippet | null {
  if (isDeepSeekClaudeModel(model)) {
    return snippets.find(snippet => isClaudeSnippet(snippet) && (
      snippet.id === 'claude-deepseek-v4'
      || /deepseek/i.test(snippet.name)
      || /api\.deepseek\.com/i.test(snippet.envVars)
    )) ?? null;
  }
  if (isKimiClaudeModel(model)) {
    return snippets.find(snippet => isClaudeSnippet(snippet) && (
      snippet.id === 'claude-kimi-official'
      || /kimi|moonshot/i.test(snippet.name)
      || /api\.moonshot\.cn/i.test(snippet.envVars)
    )) ?? null;
  }
  if (isOpenRouterClaudeModel(model)) {
    return snippets.find(snippet => isClaudeSnippet(snippet) && (
      snippet.id === 'claude-openrouter-official'
      || /openrouter/i.test(snippet.name)
      || /openrouter\.ai/i.test(snippet.envVars)
    )) ?? null;
  }
  return null;
}

function getKimiEnvironment(model: string): Record<string, string> {
  if (!isKimiClaudeModel(model)) {
    return {};
  }
  const runtimeModel = toClaudeRuntimeModelId(model).trim();
  const contextWindow = getModelParts(runtimeModel).slug === 'kimi-k3'
    ? '1048576'
    : '262144';
  return {
    ANTHROPIC_MODEL: runtimeModel,
    ANTHROPIC_DEFAULT_OPUS_MODEL: runtimeModel,
    ANTHROPIC_DEFAULT_SONNET_MODEL: runtimeModel,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: runtimeModel,
    ANTHROPIC_DEFAULT_FABLE_MODEL: runtimeModel,
    CLAUDE_CODE_SUBAGENT_MODEL: runtimeModel,
    CLAUDE_CODE_AUTO_COMPACT_WINDOW: contextWindow,
    ENABLE_TOOL_SEARCH: 'false',
  };
}

function formatEnvironmentOverrides(environment: Record<string, string>): string {
  return Object.entries(environment)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

function normalizeDeepSeekEnvironment(
  environment: Record<string, string>,
  selectedModel: string,
): Record<string, string> {
  if (!isDeepSeekClaudeModel(selectedModel)) {
    return environment;
  }
  const normalized = Object.fromEntries(
    Object.entries(environment).map(([key, value]) => [
      key,
      isDeepSeekClaudeModel(value)
        ? normalizeClaudeRuntimeModelId(value)
        : value,
    ]),
  );
  normalized.ANTHROPIC_MODEL = normalizeClaudeRuntimeModelId(selectedModel);
  return normalized;
}

export interface ClaudeModelEnvironmentResolution {
  readonly environment: Record<string, string>;
  readonly fingerprint: string;
  readonly routeSnippetId?: string;
}

export function resolveClaudeModelEnvironment(
  settings: { envSnippets?: EnvSnippet[] },
  baseEnvironmentText: string,
  selectedModel: string,
): ClaudeModelEnvironmentResolution {
  const routeSnippet = findRouteSnippet(settings.envSnippets ?? [], selectedModel);
  const kimiEnvironment = getKimiEnvironment(selectedModel);
  const environmentText = joinEnvironmentTexts(
    baseEnvironmentText,
    routeSnippet?.envVars,
    formatEnvironmentOverrides(kimiEnvironment),
  );
  const environment = normalizeDeepSeekEnvironment(
    {
      ...parseEnvironmentVariables(baseEnvironmentText),
      ...(routeSnippet ? parseEnvironmentVariables(routeSnippet.envVars) : {}),
      ...kimiEnvironment,
    },
    selectedModel,
  );
  const usesModelScopedEnvironment = usesModelScopedClaudeEnvironment(selectedModel);
  const fingerprint = createRuntimeInputFingerprint({
    additionalInputs: {
      environmentText,
      model: usesModelScopedEnvironment
        ? normalizeClaudeRuntimeModelId(selectedModel)
        : undefined,
      routeSnippetId: routeSnippet?.id,
    },
    environmentKeys: [],
    environmentText: '',
  });
  return {
    environment,
    fingerprint,
    ...(routeSnippet ? { routeSnippetId: routeSnippet.id } : {}),
  };
}
