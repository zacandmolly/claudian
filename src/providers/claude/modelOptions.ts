import { getRuntimeEnvironmentVariables } from '../../core/providers/providerEnvironment';
import type { ProviderUIOption } from '../../core/providers/types';
import { resolveProviderGroupForModelId, resolveProviderIconForModelId } from '../../shared/icons';
import { getModelsFromEnvironment } from './env/claudeModelEnv';
import { formatCustomModelLabel } from './modelLabels';
import { getClaudeProviderSettings } from './settings';
import { DEFAULT_CLAUDE_MODELS, filterVisibleModelOptions } from './types/models';

function parseConfiguredCustomModelIds(value: string): string[] {
  const modelIds: string[] = [];
  const seen = new Set<string>();

  for (const line of value.split(/\r?\n/)) {
    const modelId = line.trim();
    if (!modelId || seen.has(modelId)) {
      continue;
    }
    seen.add(modelId);
    modelIds.push(modelId);
  }

  return modelIds;
}

function normalizeCustomModelAliases(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const aliases: Record<string, string> = {};
  for (const [rawModelId, rawAlias] of Object.entries(value)) {
    if (typeof rawAlias !== 'string') {
      continue;
    }

    const modelId = rawModelId.trim();
    const alias = rawAlias.trim();
    if (modelId && alias) {
      aliases[modelId] = alias;
    }
  }

  return aliases;
}

function normalizeModelId(modelId: string): string {
  return modelId.trim().toLowerCase();
}

function getModelSlug(modelId: string): string {
  const normalized = normalizeModelId(modelId).replace(/\[1m\]$/, '');
  return normalized.split('/').pop() ?? normalized;
}

function isOpus48Model(modelId: string): boolean {
  return getModelSlug(modelId) === 'claude-opus-4.8'
    || getModelSlug(modelId) === 'claude-opus-4-8';
}

function isCodexProviderEnabled(settings: Record<string, unknown>): boolean {
  const providerConfigs = settings.providerConfigs;
  if (providerConfigs && typeof providerConfigs === 'object' && !Array.isArray(providerConfigs)) {
    const codexConfig = (providerConfigs as Record<string, unknown>).codex;
    if (codexConfig && typeof codexConfig === 'object' && !Array.isArray(codexConfig)) {
      return (codexConfig as Record<string, unknown>).enabled === true;
    }
  }

  return settings.codexEnabled === true;
}

function isCodexBackedGptAlias(modelId: string): boolean {
  const normalized = normalizeModelId(modelId).replace(/\[1m\]$/, '');
  const slashIndex = normalized.indexOf('/');
  if (slashIndex < 0 || normalized.slice(0, slashIndex) !== 'openai') {
    return false;
  }

  const slug = normalized.slice(slashIndex + 1);
  return slug.startsWith('gpt-');
}

function shouldHideFromClaudeModelOptions(modelId: string, settings: Record<string, unknown>): boolean {
  return isCodexProviderEnabled(settings) && isCodexBackedGptAlias(modelId);
}

function shouldHideBuiltInModel(modelId: string, customModelIds: string[]): boolean {
  const hasCustomOpus48 = customModelIds.some(isOpus48Model);

  if (!hasCustomOpus48) {
    return false;
  }

  const normalized = normalizeModelId(modelId);
  return normalized === 'opus[1m]' || isOpus48Model(modelId);
}

function getModelGroupVisualRank(option: ProviderUIOption): number {
  const group = option.group ?? resolveProviderGroupForModelId(option.value);
  if (group === 'Claude') return 0;
  if (group === 'OpenRouter') return 1;
  if (group === 'Kimi') return 2;
  if (group === 'DeepSeek') return 3;
  if (group === 'GPT') return 4;
  return 4;
}

function getModelItemVisualRank(option: ProviderUIOption): number {
  const group = option.group ?? resolveProviderGroupForModelId(option.value);
  const slug = getModelSlug(option.value);

  if (group === 'Claude') {
    if (slug.includes('fable')) return 0;
    if (slug.includes('opus')) return 1;
    if (slug.includes('sonnet')) return 2;
    if (slug.includes('haiku')) return 3;
  }

  if (group === 'OpenRouter') {
    if (slug.includes('fable')) return 0;
    if (slug.includes('opus')) return 1;
    if (slug.includes('sonnet')) return 2;
    if (slug.includes('haiku')) return 3;
    if (slug.includes('fusion')) return 4;
  }

  if (group === 'Kimi') {
    if (slug === 'kimi-k3') return 0;
    if (slug.startsWith('kimi-k2.7-code')) return 1;
    if (slug === 'kimi-k2.6') return 2;
  }

  if (group === 'DeepSeek') {
    if (slug.includes('flash')) return 0;
    if (slug.includes('pro')) return 1;
  }

  if (group === 'GPT') {
    if (slug === 'gpt-5.5') return 0;
    if (slug === 'gpt-5.4-mini') return 1;
  }

  return 100;
}

function sortModelOptionsForMenu(models: ProviderUIOption[]): ProviderUIOption[] {
  return [...models].sort((a, b) => {
    const groupDelta = getModelGroupVisualRank(b) - getModelGroupVisualRank(a);
    if (groupDelta !== 0) {
      return groupDelta;
    }

    return getModelItemVisualRank(b) - getModelItemVisualRank(a);
  });
}

function withModelMenuMetadata(option: ProviderUIOption): ProviderUIOption {
  const providerIcon = option.providerIcon ?? resolveProviderIconForModelId(option.value);
  const group = option.group ?? resolveProviderGroupForModelId(option.value);
  return {
    ...option,
    ...(group ? { group } : {}),
    ...(providerIcon ? { providerIcon } : {}),
  };
}

export function getClaudeModelOptions(settings: Record<string, unknown>): ProviderUIOption[] {
  const customModelAliases = normalizeCustomModelAliases(settings.customModelAliases);
  const customModels = getModelsFromEnvironment(
    getRuntimeEnvironmentVariables(settings, 'claude'),
    customModelAliases,
  );
  if (customModels.length > 0) {
    return sortModelOptionsForMenu(customModels.map(withModelMenuMetadata));
  }

  const claudeSettings = getClaudeProviderSettings(settings);
  const customModelIds = parseConfiguredCustomModelIds(claudeSettings.customModels);
  const models: ProviderUIOption[] = filterVisibleModelOptions(
    claudeSettings.showDefaultModels ? [...DEFAULT_CLAUDE_MODELS] : [],
    claudeSettings.enableOpus1M,
    claudeSettings.enableSonnet1M,
  ).filter(model => !shouldHideBuiltInModel(model.value, customModelIds));

  const seenValues = new Set(models.map(model => model.value));
  for (const modelId of customModelIds) {
    if (shouldHideFromClaudeModelOptions(modelId, settings)) {
      continue;
    }

    if (seenValues.has(modelId)) {
      continue;
    }

    seenValues.add(modelId);
    models.push(withModelMenuMetadata({
      value: modelId,
      label: customModelAliases[modelId] ?? formatCustomModelLabel(modelId),
      description: 'Custom model',
    }));
  }

  return sortModelOptionsForMenu(models.map(withModelMenuMetadata));
}

export function resolveClaudeModelSelection(
  settings: Record<string, unknown>,
  currentModel: string,
): string | null {
  const modelOptions = getClaudeModelOptions(settings);
  if (currentModel && modelOptions.some(option => option.value === currentModel)) {
    return currentModel;
  }

  const lastModel = getClaudeProviderSettings(settings).lastModel;
  if (lastModel && modelOptions.some(option => option.value === lastModel)) {
    return lastModel;
  }

  return modelOptions[0]?.value ?? null;
}
