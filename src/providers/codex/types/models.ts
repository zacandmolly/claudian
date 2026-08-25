import type { ProviderUIOption } from '../../../core/providers/types';

export type CodexModel = string;

export const CODEX_SPARK_MODEL: CodexModel = 'gpt-5.3-codex-spark';
export const DEFAULT_CODEX_MINI_MODEL: CodexModel = 'gpt-5.4-mini';
export const GPT_5_6_SOL_MODEL: CodexModel = 'gpt-5.6-sol';
export const GPT_5_6_TERRA_MODEL: CodexModel = 'gpt-5.6-terra';
export const GPT_5_6_LUNA_MODEL: CodexModel = 'gpt-5.6-luna';
export const DEFAULT_CODEX_PRIMARY_MODEL: CodexModel = GPT_5_6_TERRA_MODEL;

const LEGACY_CODEX_REASONING_EFFORTS = ['low', 'medium', 'high', 'xhigh'] as const;
const GPT_5_6_MAX_REASONING_EFFORTS = [...LEGACY_CODEX_REASONING_EFFORTS, 'max'] as const;
const GPT_5_6_ULTRA_REASONING_EFFORTS = [...GPT_5_6_MAX_REASONING_EFFORTS, 'ultra'] as const;
const DEFAULT_CODEX_CONTEXT_WINDOW = 200_000;
const GPT_5_6_CONTEXT_WINDOW = 372_000;

function formatCodexModelSuffix(suffix: string): string {
  return suffix
    .split('-')
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

export function formatCodexModelLabel(model: string): string {
  const normalized = normalizeCodexModelId(model) ?? model;
  const match = normalized.match(/^gpt-([^-]+)(?:-(.+))?$/i);
  if (!match) {
    return normalized;
  }

  const [, version, suffix] = match;
  return `GPT-${version}${suffix ? ` ${formatCodexModelSuffix(suffix)}` : ''}`;
}

function createCodexModelOption(model: CodexModel, description: string): ProviderUIOption {
  return {
    value: model,
    label: formatCodexModelLabel(model),
    description,
  };
}

export const DEFAULT_CODEX_MINI_MODEL_LABEL = formatCodexModelLabel(DEFAULT_CODEX_MINI_MODEL);
export const DEFAULT_CODEX_PRIMARY_MODEL_LABEL = formatCodexModelLabel(DEFAULT_CODEX_PRIMARY_MODEL);
export const FAST_TIER_CODEX_DESCRIPTION = 'Enable fast mode for this conversation. Faster responses use more credits.';

export const DEFAULT_CODEX_MODELS: ProviderUIOption[] = [
  createCodexModelOption(DEFAULT_CODEX_MINI_MODEL, 'Fast'),
  createCodexModelOption(CODEX_SPARK_MODEL, 'Spark'),
  createCodexModelOption(GPT_5_6_LUNA_MODEL, 'Fast and affordable'),
  createCodexModelOption(GPT_5_6_TERRA_MODEL, 'Balanced'),
  createCodexModelOption(GPT_5_6_SOL_MODEL, 'Frontier'),
];

export const DEFAULT_CODEX_MODEL_SET = new Set(DEFAULT_CODEX_MODELS.map(model => model.value));

export function normalizeCodexModelId(model: string | undefined): string | undefined {
  const trimmed = model?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^openai\/gpt-/i.test(trimmed)) {
    return trimmed.slice('openai/'.length);
  }

  return trimmed;
}

export function isCodexOpenAiGptAlias(model: string): boolean {
  const trimmed = model.trim();
  return /^openai\/gpt-/i.test(trimmed) && normalizeCodexModelId(trimmed) !== trimmed;
}

export function isCodexRoutableModel(model: string): boolean {
  const normalized = normalizeCodexModelId(model) ?? '';
  return /^gpt-/i.test(normalized) || /^o\d/i.test(normalized);
}

export function getCodexReasoningEfforts(model: string): readonly string[] {
  const normalized = normalizeCodexModelId(model);
  if (normalized === GPT_5_6_SOL_MODEL || normalized === GPT_5_6_TERRA_MODEL) {
    return GPT_5_6_ULTRA_REASONING_EFFORTS;
  }
  if (normalized === GPT_5_6_LUNA_MODEL) {
    return GPT_5_6_MAX_REASONING_EFFORTS;
  }
  return LEGACY_CODEX_REASONING_EFFORTS;
}

export function getDefaultCodexReasoningEffort(model: string): string {
  return normalizeCodexModelId(model) === GPT_5_6_SOL_MODEL ? 'low' : 'medium';
}

export function getCodexContextWindowSize(model: string): number {
  const normalized = normalizeCodexModelId(model);
  return normalized === GPT_5_6_SOL_MODEL
    || normalized === GPT_5_6_TERRA_MODEL
    || normalized === GPT_5_6_LUNA_MODEL
    ? GPT_5_6_CONTEXT_WINDOW
    : DEFAULT_CODEX_CONTEXT_WINDOW;
}

export function supportsCodexFastTier(model: string | undefined): boolean {
  const normalized = normalizeCodexModelId(model);
  return normalized === DEFAULT_CODEX_PRIMARY_MODEL
    || normalized === GPT_5_6_SOL_MODEL
    || normalized === GPT_5_6_TERRA_MODEL
    || normalized === GPT_5_6_LUNA_MODEL;
}
