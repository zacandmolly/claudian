import type {
  ProviderChatUIConfig,
  ProviderPermissionModeToggleConfig,
  ProviderReasoningOption,
  ProviderServiceTierToggleConfig,
  ProviderUIOption,
} from '../../../core/providers/types';
import { OPENAI_PROVIDER_ICON } from '../../../shared/icons';
import { getCodexModelOptions } from '../modelOptions';
import { applyCodexModelDefaults } from '../settings';
import {
  DEFAULT_CODEX_MODEL_SET,
  DEFAULT_CODEX_PRIMARY_MODEL,
  FAST_TIER_CODEX_DESCRIPTION,
  getCodexContextWindowSize,
  getCodexReasoningEfforts,
  getDefaultCodexReasoningEffort,
  isCodexRoutableModel,
  normalizeCodexModelId,
  supportsCodexFastTier,
} from '../types/models';

const EFFORT_LEVELS: ProviderReasoningOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'XHigh' },
  { value: 'max', label: 'Max' },
  { value: 'ultra', label: 'Ultra' },
];

const CODEX_PERMISSION_MODE_TOGGLE: ProviderPermissionModeToggleConfig = {
  inactiveValue: 'normal',
  inactiveLabel: 'Safe',
  activeValue: 'yolo',
  activeLabel: 'YOLO',
  planValue: 'plan',
  planLabel: 'Plan',
};

const CODEX_SERVICE_TIER_TOGGLE: ProviderServiceTierToggleConfig = {
  inactiveValue: 'default',
  inactiveLabel: 'Standard',
  activeValue: 'fast',
  activeLabel: 'Fast',
  description: FAST_TIER_CODEX_DESCRIPTION,
};

function looksLikeCodexModel(model: string): boolean {
  return isCodexRoutableModel(model);
}

export const codexChatUIConfig: ProviderChatUIConfig = {
  getModelOptions(settings: Record<string, unknown>): ProviderUIOption[] {
    return getCodexModelOptions(settings);
  },

  ownsModel(model: string, settings: Record<string, unknown>): boolean {
    const normalized = normalizeCodexModelId(model) ?? model;
    if (getCodexModelOptions(settings).some((option: ProviderUIOption) => option.value === normalized)) {
      return true;
    }

    return looksLikeCodexModel(normalized);
  },

  isAdaptiveReasoningModel(_model: string, _settings: Record<string, unknown>): boolean {
    return true;
  },

  getReasoningOptions(model: string, _settings: Record<string, unknown>): ProviderReasoningOption[] {
    const supportedEfforts = new Set(getCodexReasoningEfforts(model));
    return EFFORT_LEVELS.filter(option => supportedEfforts.has(option.value));
  },

  getDefaultReasoningValue(model: string, _settings: Record<string, unknown>): string {
    return getDefaultCodexReasoningEffort(model);
  },

  getContextWindowSize(model: string): number {
    return getCodexContextWindowSize(model);
  },

  isDefaultModel(model: string): boolean {
    const normalized = normalizeCodexModelId(model) ?? model;
    return DEFAULT_CODEX_MODEL_SET.has(normalized);
  },

  applyModelDefaults(model: string, settings: unknown): void {
    if (!settings || typeof settings !== 'object') {
      return;
    }

    applyCodexModelDefaults(model, settings as Record<string, unknown>);
  },

  normalizeModelVariant(model: string, settings: Record<string, unknown>): string {
    const normalized = normalizeCodexModelId(model) ?? model;
    if (getCodexModelOptions(settings).some((option) => option.value === normalized)) {
      return normalized;
    }

    return DEFAULT_CODEX_PRIMARY_MODEL;
  },

  getCustomModelIds(envVars: Record<string, string>): Set<string> {
    const ids = new Set<string>();
    const normalized = normalizeCodexModelId(envVars.OPENAI_MODEL);
    if (normalized && !DEFAULT_CODEX_MODEL_SET.has(normalized)) {
      ids.add(normalized);
    }
    return ids;
  },

  getPermissionModeToggle(): ProviderPermissionModeToggleConfig {
    return CODEX_PERMISSION_MODE_TOGGLE;
  },

  getServiceTierToggle(settings): ProviderServiceTierToggleConfig | null {
    return supportsCodexFastTier(settings.model as string | undefined)
      ? CODEX_SERVICE_TIER_TOGGLE
      : null;
  },

  getProviderIcon() {
    return OPENAI_PROVIDER_ICON;
  },
};
