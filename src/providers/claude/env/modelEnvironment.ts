import { joinEnvironmentTexts } from '../../../core/providers/providerEnvironment';
import type { EnvSnippet } from '../../../core/types/settings';
import { parseEnvironmentVariables } from '../../../utils/env';

function normalizeModelId(model: string): string {
  return model.trim().toLowerCase();
}

function isDeepSeekModel(model: string): boolean {
  return normalizeModelId(model).replace(/\[1m\]$/, '').split('/').some(part => part.includes('deepseek'));
}

/**
 * Claudian uses [1m] as a local context-window marker. DeepSeek's API model
 * IDs are canonical without that marker, so remove it at the SDK boundary.
 */
export function normalizeClaudeRuntimeModelId(model: string): string {
  const trimmed = model.trim();
  return isDeepSeekModel(trimmed) ? trimmed.replace(/\[1m\]$/i, '') : trimmed;
}

function normalizeDeepSeekEnvironment(
  env: Record<string, string>,
  selectedModel: string,
): Record<string, string> {
  if (!isDeepSeekModel(selectedModel)) {
    return env;
  }

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    normalized[key] = isDeepSeekModel(value)
      ? normalizeClaudeRuntimeModelId(value)
      : value;
  }

  // The explicit model selected in the UI must win over a stale model value
  // kept in a provider snippet.
  normalized.ANTHROPIC_MODEL = normalizeClaudeRuntimeModelId(selectedModel);
  return normalized;
}

function isOpenRouterModel(model: string): boolean {
  const normalized = normalizeModelId(model).replace(/\[1m\]$/, '');
  const parts = normalized.split('/');
  const provider = parts.length > 1 ? parts[0] : '';
  const slug = parts.length > 1 ? parts.slice(1).join('/') : normalized;
  return provider === 'openrouter'
    || provider === '~anthropic'
    || (provider === 'anthropic' && slug.startsWith('claude-'));
}

function isKimiModel(model: string): boolean {
  const normalized = normalizeModelId(model).replace(/\[1m\]$/, '');
  const parts = normalized.split('/');
  const provider = parts.length > 1 ? parts[0] : '';
  const slug = parts.length > 1 ? parts.slice(1).join('/') : normalized;
  return provider === 'moonshotai' || slug.startsWith('kimi-');
}

function isProviderClaudeSnippet(snippet: EnvSnippet): boolean {
  return !snippet.scope || snippet.scope === 'provider:claude';
}

function findDeepSeekSnippet(snippets: EnvSnippet[]): EnvSnippet | null {
  return snippets.find(snippet =>
    isProviderClaudeSnippet(snippet)
    && (
      snippet.id === 'claude-deepseek-v4'
      || /deepseek/i.test(snippet.name)
      || /api\.deepseek\.com/i.test(snippet.envVars)
    )
  ) ?? null;
}

function findWoWCodeSnippet(snippets: EnvSnippet[]): EnvSnippet | null {
  return snippets.find(snippet =>
    isProviderClaudeSnippet(snippet)
    && (
      snippet.id === 'claude-wowcode-before-deepseek-v4'
      || /wowcode/i.test(snippet.name)
      || /wowcode\.cc/i.test(snippet.envVars)
    )
  ) ?? null;
}

function findOpenRouterSnippet(snippets: EnvSnippet[]): EnvSnippet | null {
  return snippets.find(snippet =>
    isProviderClaudeSnippet(snippet)
    && (
      snippet.id === 'claude-openrouter-official'
      || /openrouter/i.test(snippet.name)
      || /openrouter\.ai/i.test(snippet.envVars)
    )
  ) ?? null;
}

function findKimiSnippet(snippets: EnvSnippet[]): EnvSnippet | null {
  return snippets.find(snippet =>
    isProviderClaudeSnippet(snippet)
    && (
      snippet.id === 'claude-kimi-official'
      || /kimi|moonshot/i.test(snippet.name)
      || /api\.moonshot\.cn/i.test(snippet.envVars)
    )
  ) ?? null;
}

function findRouteSnippet(settings: { envSnippets?: EnvSnippet[] }, model: string): EnvSnippet | null {
  const snippets = settings.envSnippets ?? [];
  if (isDeepSeekModel(model)) {
    return findDeepSeekSnippet(snippets);
  }

  if (isKimiModel(model)) {
    return findKimiSnippet(snippets);
  }

  if (isOpenRouterModel(model)) {
    return findOpenRouterSnippet(snippets);
  }

  return findWoWCodeSnippet(snippets);
}

function getKimiModelEnvironment(model: string): Record<string, string> {
  if (!isKimiModel(model)) {
    return {};
  }

  const contextWindow = normalizeModelId(model).replace(/\[1m\]$/, '') === 'kimi-k3'
    ? '1048576'
    : '262144';

  return {
    ANTHROPIC_MODEL: model,
    ANTHROPIC_DEFAULT_OPUS_MODEL: model,
    ANTHROPIC_DEFAULT_SONNET_MODEL: model,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: model,
    ANTHROPIC_DEFAULT_FABLE_MODEL: model,
    CLAUDE_CODE_SUBAGENT_MODEL: model,
    CLAUDE_CODE_AUTO_COMPACT_WINDOW: contextWindow,
    ENABLE_TOOL_SEARCH: 'false',
  };
}

export function resolveClaudeEnvironmentTextForModel(
  settings: { envSnippets?: EnvSnippet[] },
  baseEnvText: string,
  model: string,
): string {
  const routeSnippet = findRouteSnippet(settings, model);
  if (!routeSnippet) {
    return baseEnvText;
  }

  const kimiModelEnv = Object.entries(getKimiModelEnvironment(model))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  return joinEnvironmentTexts(baseEnvText, routeSnippet.envVars, kimiModelEnv);
}

export function resolveClaudeEnvironmentForModel(
  settings: { envSnippets?: EnvSnippet[] },
  baseEnv: Record<string, string>,
  model: string,
): Record<string, string> {
  const routeSnippet = findRouteSnippet(settings, model);
  if (!routeSnippet) {
    return normalizeDeepSeekEnvironment(baseEnv, model);
  }

  const resolvedEnv = {
    ...baseEnv,
    ...parseEnvironmentVariables(routeSnippet.envVars),
    ...getKimiModelEnvironment(model),
  };
  return normalizeDeepSeekEnvironment(resolvedEnv, model);
}

export function getClaudeEnvironmentKey(env: Record<string, string | undefined>): string {
  return [
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_MODEL',
    'ANTHROPIC_DEFAULT_OPUS_MODEL',
    'ANTHROPIC_DEFAULT_SONNET_MODEL',
    'ANTHROPIC_DEFAULT_HAIKU_MODEL',
    'ANTHROPIC_DEFAULT_FABLE_MODEL',
    'CLAUDE_CODE_SUBAGENT_MODEL',
    'CLAUDE_CODE_AUTO_COMPACT_WINDOW',
    'ENABLE_TOOL_SEARCH',
    'CLAUDE_CODE_EFFORT_LEVEL',
  ]
    .filter(key => env[key])
    .map(key => `${key}=${env[key]}`)
    .sort()
    .join('|');
}
