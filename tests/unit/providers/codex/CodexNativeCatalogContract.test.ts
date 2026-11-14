import {
  CODEX_UPSTREAM_DEFAULT_MODEL_ID,
  getOfferedCodexNativeCatalogModels,
} from '@/providers/codex/CodexNativeCatalogContract';
import {
  getDefaultCodexModel,
  normalizeCodexDiscoveredModels,
} from '@/providers/codex/models';
import { codexChatUIConfig } from '@/providers/codex/ui/CodexChatUIConfig';

const PUBLIC_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'] as const;
const LUNA_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
const GPT_55_EFFORTS = ['low', 'medium', 'high', 'xhigh'] as const;

function wireModel(
  model: string,
  options: {
    contextWindow: number;
    defaultReasoningEffort: string;
    efforts: readonly string[];
    isDefault?: boolean;
  },
) {
  return {
    id: model,
    model,
    displayName: model,
    description: `${model} from app-server`,
    hidden: false,
    visibility: 'list',
    supportedReasoningEfforts: options.efforts.map(effort => ({
      reasoningEffort: effort,
      description: effort,
    })),
    defaultReasoningEffort: options.defaultReasoningEffort,
    contextWindow: options.contextWindow,
    inputModalities: ['text', 'image'],
    serviceTiers: [{ id: 'priority', name: 'Fast', description: 'Fast' }],
    defaultServiceTier: null,
    isDefault: options.isDefault === true,
  };
}

describe('Codex native GPT catalog contract', () => {
  it('uses gpt-6.1-sol as the default and fills an empty discovery result from the public catalog', () => {
    const settings = {
      providerConfigs: {
        codex: {
          discoveredModels: [],
          visibleModels: null,
        },
      },
    };

    expect(getOfferedCodexNativeCatalogModels().map(model => model.model)).toEqual([
      'gpt-6.1-sol',
      'gpt-6-astra',
      'gpt-6-sol',
      'gpt-6-luna',
      'gpt-5.6-sol',
      'gpt-6.1-terra',
      'gpt-5.6-terra',
      'gpt-5.6-luna',
      'gpt-5.5',
    ]);
    expect(CODEX_UPSTREAM_DEFAULT_MODEL_ID).toBe('gpt-6.1-sol');
    expect(codexChatUIConfig.getDefaultModel?.(settings)).toBe('gpt-6.1-sol');
    expect(codexChatUIConfig.getModelOptions(settings).map(option => option.value)).toEqual([
      'gpt-5.5',
      'gpt-5.6-luna',
      'gpt-5.6-terra',
      'gpt-6.1-terra',
      'gpt-5.6-sol',
      'gpt-6-luna',
      'gpt-6-sol',
      'gpt-6-astra',
      'gpt-6.1-sol',
    ]);
    expect(codexChatUIConfig.getModelOptions(settings).map(option => option.value))
      .not.toEqual(expect.arrayContaining(['gpt-6-cyber', 'gpt-daybreak-blue-latest', 'gpt-daybreak-red-latest']));
  });

  it('falls back to the discovered default when gpt-6.1-sol is absent', () => {
    const settings = {
      providerConfigs: {
        codex: {
          discoveredModels: [
            wireModel('gpt-5.5', {
              contextWindow: 272_000,
              defaultReasoningEffort: 'medium',
              efforts: GPT_55_EFFORTS,
              isDefault: true,
            }),
            wireModel('gpt-5.6-luna', {
              contextWindow: 272_000,
              defaultReasoningEffort: 'medium',
              efforts: LUNA_EFFORTS,
            }),
          ],
          visibleModels: null,
        },
      },
    };

    expect(codexChatUIConfig.getDefaultModel?.(settings)).toBe('gpt-5.5');
    expect(codexChatUIConfig.getModelOptions(settings).map(option => option.value)).toEqual([
      'gpt-5.6-luna',
      'gpt-5.5',
    ]);
  });

  it('prefers an available gpt-6.1-sol over another app-server default', () => {
    const settings = {
      providerConfigs: {
        codex: {
          discoveredModels: [
            wireModel('gpt-5.5', {
              contextWindow: 272_000,
              defaultReasoningEffort: 'medium',
              efforts: GPT_55_EFFORTS,
              isDefault: true,
            }),
            wireModel('gpt-6.1-sol', {
              contextWindow: 272_000,
              defaultReasoningEffort: 'low',
              efforts: PUBLIC_EFFORTS,
            }),
          ],
          visibleModels: null,
        },
      },
    };

    expect(codexChatUIConfig.getDefaultModel?.(settings)).toBe('gpt-6.1-sol');
    expect(codexChatUIConfig.getModelOptions(settings).map(option => option.value)).toEqual([
      'gpt-6.1-sol',
      'gpt-5.5',
    ]);
  });

  it('skips an unavailable gpt-6.1-sol and keeps another discovered model selectable', () => {
    const settings = {
      providerConfigs: {
        codex: {
          discoveredModels: [
            wireModel('gpt-6.1-sol', {
              contextWindow: 272_000,
              defaultReasoningEffort: 'ultra',
              efforts: ['ultra'],
              isDefault: true,
            }),
            wireModel('gpt-5.5', {
              contextWindow: 272_000,
              defaultReasoningEffort: 'medium',
              efforts: GPT_55_EFFORTS,
            }),
          ],
          enableUltraEffort: false,
          visibleModels: null,
        },
      },
    };

    expect(codexChatUIConfig.getDefaultModel?.(settings)).toBe('gpt-5.5');
    expect(codexChatUIConfig.getModelOptions(settings).map(option => option.value)).toEqual([
      'gpt-5.5',
    ]);
  });

  it('normalizes a discovered GPT-6 catalog without offering Cyber or Daybreak models', () => {
    const models = normalizeCodexDiscoveredModels([
      wireModel('gpt-6.1-sol', {
        contextWindow: 272_000,
        defaultReasoningEffort: 'low',
        efforts: PUBLIC_EFFORTS,
        isDefault: true,
      }),
      wireModel('gpt-6-astra', {
        contextWindow: 272_000,
        defaultReasoningEffort: 'low',
        efforts: PUBLIC_EFFORTS,
      }),
      wireModel('gpt-6-sol', {
        contextWindow: 272_000,
        defaultReasoningEffort: 'medium',
        efforts: PUBLIC_EFFORTS,
      }),
      wireModel('gpt-6-luna', {
        contextWindow: 272_000,
        defaultReasoningEffort: 'medium',
        efforts: LUNA_EFFORTS,
      }),
      wireModel('gpt-5.6-sol', {
        contextWindow: 272_000,
        defaultReasoningEffort: 'low',
        efforts: PUBLIC_EFFORTS,
      }),
      wireModel('gpt-6.1-terra', {
        contextWindow: 500_000,
        defaultReasoningEffort: 'low',
        efforts: PUBLIC_EFFORTS,
      }),
      wireModel('gpt-5.6-terra', {
        contextWindow: 272_000,
        defaultReasoningEffort: 'medium',
        efforts: PUBLIC_EFFORTS,
      }),
      wireModel('gpt-5.6-luna', {
        contextWindow: 272_000,
        defaultReasoningEffort: 'medium',
        efforts: LUNA_EFFORTS,
      }),
      wireModel('gpt-5.5', {
        contextWindow: 272_000,
        defaultReasoningEffort: 'medium',
        efforts: GPT_55_EFFORTS,
      }),
      wireModel('gpt-6-cyber', {
        contextWindow: 1_050_000,
        defaultReasoningEffort: 'medium',
        efforts: PUBLIC_EFFORTS,
      }),
      wireModel('gpt-5.6-cyber', {
        contextWindow: 272_000,
        defaultReasoningEffort: 'medium',
        efforts: PUBLIC_EFFORTS,
      }),
      wireModel('gpt-daybreak-blue-latest', {
        contextWindow: 272_000,
        defaultReasoningEffort: 'low',
        efforts: PUBLIC_EFFORTS,
      }),
      {
        ...wireModel('gpt-daybreak-red-latest', {
          contextWindow: 372_000,
          defaultReasoningEffort: 'medium',
          efforts: PUBLIC_EFFORTS,
        }),
        visibility: 'hide',
      },
    ]);

    expect(models.map(model => model.model)).toEqual([
      'gpt-6.1-sol',
      'gpt-6-astra',
      'gpt-6-sol',
      'gpt-6-luna',
      'gpt-5.6-sol',
      'gpt-6.1-terra',
      'gpt-5.6-terra',
      'gpt-5.6-luna',
      'gpt-5.5',
    ]);
    expect(getDefaultCodexModel(models)?.model).toBe('gpt-6.1-sol');
    expect(models.find(model => model.model === 'gpt-6.1-terra')?.contextWindow).toBe(500_000);
    expect(models.find(model => model.model === 'gpt-6-luna')?.supportedReasoningEfforts
      .map(option => option.value)).toEqual([...LUNA_EFFORTS]);
    expect(models.find(model => model.model === 'gpt-6-astra')?.supportedReasoningEfforts
      .map(option => option.value)).toEqual([...PUBLIC_EFFORTS]);

    const settings = {
      providerConfigs: {
        codex: {
          discoveredModels: models,
          enableUltraEffort: false,
          visibleModels: null,
        },
      },
    };
    const optionValues = codexChatUIConfig.getModelOptions(settings).map(option => option.value);
    expect(optionValues).toEqual([
      'gpt-5.5',
      'gpt-5.6-luna',
      'gpt-5.6-terra',
      'gpt-6.1-terra',
      'gpt-5.6-sol',
      'gpt-6-luna',
      'gpt-6-sol',
      'gpt-6-astra',
      'gpt-6.1-sol',
    ]);
    expect(optionValues).not.toContain('gpt-6-cyber');
    expect(codexChatUIConfig.getReasoningOptions('gpt-6-astra', settings).map(option => option.value))
      .toEqual(['low', 'medium', 'high', 'xhigh', 'max']);
    expect(codexChatUIConfig.getReasoningOptions('gpt-6-astra', {
      providerConfigs: {
        codex: {
          discoveredModels: models,
          enableUltraEffort: true,
        },
      },
    }).map(option => option.value)).toEqual([...PUBLIC_EFFORTS]);
    expect(codexChatUIConfig.getDefaultModel?.(settings)).toBe('gpt-6.1-sol');
  });

  it('leaves an explicit custom GPT-6 Cyber id available without discovering it', () => {
    const values = codexChatUIConfig.getModelOptions({
      providerConfigs: {
        codex: {
          customModels: 'gpt-6-cyber',
          discoveredModels: [],
          visibleModels: null,
        },
      },
    }).map(option => option.value);

    expect(values).toContain('openai-codex/gpt-6-cyber');
    expect(values).toContain('gpt-6.1-sol');
    expect(values.filter(value => value.includes('cyber') || value.includes('daybreak'))).toEqual([
      'openai-codex/gpt-6-cyber',
    ]);
  });
});
