/**
 * Public Codex catalog contract for GPT models.
 *
 * The app-server catalog remains the picker source. These entries describe the
 * current public models from the Codex bundled catalog so a known selection can
 * resolve context and reasoning before discovery returns, and so restricted
 * cyber/Daybreak models are not treated as default catalog entries.
 *
 * Sources checked against the bundled catalog and OpenAI's model docs:
 * context windows and reasoning levels below are the Codex catalog values.
 * Ultra stays in the catalog data and is filtered by the existing opt-in.
 */

export interface CodexNativeCatalogModel {
  model: string;
  displayName: string;
  description: string;
  supportedReasoningEfforts: Array<{ value: string; description: string }>;
  defaultReasoningEffort: string;
  serviceTiers: Array<{ id: string; name: string; description: string }>;
  defaultServiceTier: null;
  inputModalities: Array<'text' | 'image'>;
  isDefault: boolean;
  contextWindow: number;
}

const LOW = { value: 'low', description: 'Fast responses with lighter reasoning' };
const MEDIUM = {
  value: 'medium',
  description: 'Balances speed and reasoning depth for everyday tasks',
};
const HIGH = { value: 'high', description: 'Greater reasoning depth for complex problems' };
const XHIGH = { value: 'xhigh', description: 'Extra high reasoning depth for complex problems' };
const MAX = { value: 'max', description: 'Maximum reasoning depth for the hardest problems' };
const ULTRA = { value: 'ultra', description: 'Maximum reasoning with automatic task delegation' };

const WITH_ULTRA = [LOW, MEDIUM, HIGH, XHIGH, MAX, ULTRA];
const THROUGH_MAX = [LOW, MEDIUM, HIGH, XHIGH, MAX];
const THROUGH_XHIGH = [LOW, MEDIUM, HIGH, XHIGH];

const FAST_2X = { id: 'priority', name: 'Fast', description: '2x speed, increased usage' };
const FAST_1_5 = { id: 'priority', name: 'Fast', description: '1.5x speed' };
const FAST_1_5_USAGE = { id: 'priority', name: 'Fast', description: '1.5x speed, increased usage' };

const TEXT_AND_IMAGE: Array<'text' | 'image'> = ['text', 'image'];

function catalogModel(
  model: string,
  displayName: string,
  description: string,
  efforts: Array<{ value: string; description: string }>,
  defaultReasoningEffort: string,
  serviceTier: { id: string; name: string; description: string },
  contextWindow: number,
  isDefault = false,
): CodexNativeCatalogModel {
  return {
    model,
    displayName,
    description,
    supportedReasoningEfforts: efforts,
    defaultReasoningEffort,
    serviceTiers: [serviceTier],
    defaultServiceTier: null,
    inputModalities: TEXT_AND_IMAGE,
    isDefault,
    contextWindow,
  };
}

const OFFERED_MODELS: readonly CodexNativeCatalogModel[] = [
  catalogModel(
    'gpt-6.1-sol',
    'GPT-6.1-Sol',
    'Latest workhorse model for coding and everyday work.',
    WITH_ULTRA,
    'low',
    FAST_2X,
    272_000,
    true,
  ),
  catalogModel(
    'gpt-6-astra',
    'GPT-6-Astra',
    'Frontier intelligence for the most demanding work.',
    WITH_ULTRA,
    'low',
    FAST_2X,
    272_000,
  ),
  catalogModel(
    'gpt-6-sol',
    'GPT-6-Sol',
    'Previous generation workhorse model.',
    WITH_ULTRA,
    'medium',
    FAST_1_5,
    272_000,
  ),
  catalogModel(
    'gpt-6-luna',
    'GPT-6-Luna',
    'Fast and affordable model for easier tasks.',
    THROUGH_MAX,
    'medium',
    FAST_1_5,
    272_000,
  ),
  catalogModel(
    'gpt-5.6-sol',
    'GPT-5.6-Sol',
    'Older generation workhorse model.',
    WITH_ULTRA,
    'low',
    FAST_1_5_USAGE,
    272_000,
  ),
  catalogModel(
    'gpt-6.1-terra',
    'GPT-6.1 Terra',
    'GPT-6.1 Terra Codex model.',
    WITH_ULTRA,
    'low',
    FAST_1_5,
    500_000,
  ),
  catalogModel(
    'gpt-5.6-terra',
    'GPT-5.6-Terra',
    'Older balanced model for straightforward work.',
    WITH_ULTRA,
    'medium',
    FAST_1_5_USAGE,
    272_000,
  ),
  catalogModel(
    'gpt-5.6-luna',
    'GPT-5.6-Luna',
    'Older fast and efficient model.',
    THROUGH_MAX,
    'medium',
    FAST_1_5_USAGE,
    272_000,
  ),
  catalogModel(
    'gpt-5.5',
    'GPT-5.5',
    'Legacy coding model.',
    THROUGH_XHIGH,
    'medium',
    FAST_1_5_USAGE,
    272_000,
  ),
];

const OFFERED_BY_SLUG = new Map(OFFERED_MODELS.map(model => [model.model, model]));

/** Upstream Codex bundled catalog default, and Claudian's Codex picker default when it is available. */
export const CODEX_UPSTREAM_DEFAULT_MODEL_ID = 'gpt-6.1-sol';

export function codexCatalogSlug(model: string): string {
  const normalized = model.trim().toLowerCase().replace(/\[1m\]$/, '');
  const slash = normalized.lastIndexOf('/');
  return slash === -1 ? normalized : normalized.slice(slash + 1);
}

export function isRestrictedCodexCatalogModel(model: string): boolean {
  const slug = codexCatalogSlug(model);
  return slug.startsWith('gpt-daybreak-') || /-cyber(?:-|$)/.test(slug);
}

export function getOfferedCodexNativeCatalogModels(): readonly CodexNativeCatalogModel[] {
  return OFFERED_MODELS;
}

export function getCodexNativeCatalogModel(modelId: string | undefined): CodexNativeCatalogModel | null {
  if (!modelId) {
    return null;
  }
  return OFFERED_BY_SLUG.get(codexCatalogSlug(modelId)) ?? null;
}

export function getCodexNativeContextWindow(modelId: string | undefined): number | null {
  return getCodexNativeCatalogModel(modelId)?.contextWindow ?? null;
}
