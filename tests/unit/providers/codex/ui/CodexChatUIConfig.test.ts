import {
  CODEX_SPARK_MODEL,
  DEFAULT_CODEX_PRIMARY_MODEL,
  GPT_5_6_LUNA_MODEL,
  GPT_5_6_SOL_MODEL,
  GPT_5_6_TERRA_MODEL,
} from '@/providers/codex/types/models';
import { codexChatUIConfig } from '@/providers/codex/ui/CodexChatUIConfig';

describe('CodexChatUIConfig', () => {
  describe('getModelOptions', () => {
    it('should return default models when no env vars', () => {
      const options = codexChatUIConfig.getModelOptions({});
      expect(options).toHaveLength(5);
      expect(options.map(o => o.value)).toEqual([
        'gpt-5.4-mini',
        CODEX_SPARK_MODEL,
        GPT_5_6_LUNA_MODEL,
        GPT_5_6_TERRA_MODEL,
        GPT_5_6_SOL_MODEL,
      ]);
      expect(options.map(o => o.value)).toContain(DEFAULT_CODEX_PRIMARY_MODEL);
      expect(options.map(o => o.value)).toContain('gpt-5.4-mini');
      expect(options.map(o => o.value)).toContain(CODEX_SPARK_MODEL);
      expect(options.map(o => o.value)).toContain(GPT_5_6_SOL_MODEL);
      expect(options.map(o => o.value)).toContain(GPT_5_6_TERRA_MODEL);
      expect(options.map(o => o.value)).toContain(GPT_5_6_LUNA_MODEL);
      expect(options.map(o => o.value)).not.toContain('gpt-5.5');
    });

    it('appends settings-defined custom models after the built-in options', () => {
      const options = codexChatUIConfig.getModelOptions({
        providerConfigs: {
          codex: {
            customModels: 'gpt-5.6-preview\nmy-custom-model\nmy-custom-model',
          },
        },
      });

      expect(options).toEqual([
        {
          value: 'gpt-5.4-mini',
          label: 'GPT-5.4 Mini',
          description: 'Fast',
        },
        {
          value: CODEX_SPARK_MODEL,
          label: 'GPT-5.3 Codex Spark',
          description: 'Spark',
        },
        {
          value: GPT_5_6_LUNA_MODEL,
          label: 'GPT-5.6 Luna',
          description: 'Fast and affordable',
        },
        {
          value: GPT_5_6_TERRA_MODEL,
          label: 'GPT-5.6 Terra',
          description: 'Balanced',
        },
        {
          value: GPT_5_6_SOL_MODEL,
          label: 'GPT-5.6 Sol',
          description: 'Frontier',
        },
        {
          value: 'gpt-5.6-preview',
          label: 'GPT-5.6 Preview',
          description: 'Custom model',
        },
        {
          value: 'my-custom-model',
          label: 'my-custom-model',
          description: 'Custom model',
        },
      ]);
    });

    it('should prepend custom model from OPENAI_MODEL env var', () => {
      const options = codexChatUIConfig.getModelOptions({
        environmentVariables: 'OPENAI_MODEL=my-custom-model',
      });
      expect(options[0].value).toBe('my-custom-model');
      expect(options[0].description).toBe('Custom (env)');
      expect(options.length).toBe(6);
    });

    it('deduplicates env and settings-defined custom models', () => {
      const options = codexChatUIConfig.getModelOptions({
        providerConfigs: {
          codex: {
            customModels: 'my-custom-model\nsecond-custom-model',
            environmentVariables: 'OPENAI_MODEL=my-custom-model',
          },
        },
      });

      expect(options.map(option => option.value)).toEqual([
        'my-custom-model',
        'gpt-5.4-mini',
        CODEX_SPARK_MODEL,
        GPT_5_6_LUNA_MODEL,
        GPT_5_6_TERRA_MODEL,
        GPT_5_6_SOL_MODEL,
        'second-custom-model',
      ]);
    });

    it('should not duplicate when OPENAI_MODEL matches a default model', () => {
      const options = codexChatUIConfig.getModelOptions({
        environmentVariables: `OPENAI_MODEL=${DEFAULT_CODEX_PRIMARY_MODEL}`,
      });
      expect(options.length).toBe(5);
    });

    it('normalizes OpenAI-prefixed GPT aliases to local Codex model ids', () => {
      const options = codexChatUIConfig.getModelOptions({
        environmentVariables: 'OPENAI_MODEL=openai/gpt-5.5',
        providerConfigs: {
          codex: {
            customModels: 'openai/gpt-5.4-mini',
          },
        },
      });

      expect(options.map(option => option.value)).toEqual([
        'gpt-5.5',
        'gpt-5.4-mini',
        CODEX_SPARK_MODEL,
        GPT_5_6_LUNA_MODEL,
        GPT_5_6_TERRA_MODEL,
        GPT_5_6_SOL_MODEL,
      ]);
    });
  });

  describe('ownsModel', () => {
    it('owns legacy OpenAI-prefixed GPT aliases through Codex OAuth routing', () => {
      expect(codexChatUIConfig.ownsModel('openai/gpt-5.5', {})).toBe(true);
      expect(codexChatUIConfig.ownsModel('openai/gpt-5.4-mini', {})).toBe(true);
      expect(codexChatUIConfig.ownsModel('openai/gpt-5.3-codex-spark', {})).toBe(true);
    });
  });

  describe('isAdaptiveReasoningModel', () => {
    it('should return true for all models', () => {
      expect(codexChatUIConfig.isAdaptiveReasoningModel(DEFAULT_CODEX_PRIMARY_MODEL, {})).toBe(true);
      expect(codexChatUIConfig.isAdaptiveReasoningModel('unknown-model', {})).toBe(true);
    });
  });

  describe('getReasoningOptions', () => {
    it('returns the full GPT-5.6 effort range for the default Terra model', () => {
      const options = codexChatUIConfig.getReasoningOptions(DEFAULT_CODEX_PRIMARY_MODEL, {});
      expect(options).toHaveLength(6);
      expect(options.map(o => o.value)).toEqual(['low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
    });

    it('supports max and ultra for GPT-5.6 Sol and Terra', () => {
      for (const model of [GPT_5_6_SOL_MODEL, GPT_5_6_TERRA_MODEL]) {
        expect(codexChatUIConfig.getReasoningOptions(model, {}).map(option => option.value)).toEqual([
          'low',
          'medium',
          'high',
          'xhigh',
          'max',
          'ultra',
        ]);
      }
    });

    it('supports max but not ultra for GPT-5.6 Luna', () => {
      expect(codexChatUIConfig.getReasoningOptions(GPT_5_6_LUNA_MODEL, {}).map(option => option.value)).toEqual([
        'low',
        'medium',
        'high',
        'xhigh',
        'max',
      ]);
    });
  });

  describe('getDefaultReasoningValue', () => {
    it('keeps medium for legacy, Terra, and Luna models', () => {
      expect(codexChatUIConfig.getDefaultReasoningValue(DEFAULT_CODEX_PRIMARY_MODEL, {})).toBe('medium');
      expect(codexChatUIConfig.getDefaultReasoningValue(GPT_5_6_TERRA_MODEL, {})).toBe('medium');
      expect(codexChatUIConfig.getDefaultReasoningValue(GPT_5_6_LUNA_MODEL, {})).toBe('medium');
    });

    it('uses the catalog default of low for GPT-5.6 Sol', () => {
      expect(codexChatUIConfig.getDefaultReasoningValue(GPT_5_6_SOL_MODEL, {})).toBe('low');
    });
  });

  describe('getContextWindowSize', () => {
    it('returns 372000 for the default Terra model', () => {
      expect(codexChatUIConfig.getContextWindowSize(DEFAULT_CODEX_PRIMARY_MODEL)).toBe(372_000);
    });

    it('returns 372000 for all GPT-5.6 models', () => {
      for (const model of [GPT_5_6_SOL_MODEL, GPT_5_6_TERRA_MODEL, GPT_5_6_LUNA_MODEL]) {
        expect(codexChatUIConfig.getContextWindowSize(model)).toBe(372_000);
      }
    });
  });

  describe('applyModelDefaults', () => {
    it('sets reasoning summary off for GPT-5.3 Codex Spark', () => {
      const settings: Record<string, unknown> = {
        providerConfigs: {
          codex: {
            reasoningSummary: 'detailed',
          },
        },
      };

      codexChatUIConfig.applyModelDefaults(CODEX_SPARK_MODEL, settings);

      expect(settings).toMatchObject({
        providerConfigs: {
          codex: {
            reasoningSummary: 'none',
          },
        },
      });
    });

    it('leaves reasoning summary unchanged for other Codex models', () => {
      const settings: Record<string, unknown> = {
        providerConfigs: {
          codex: {
            reasoningSummary: 'detailed',
          },
        },
      };

      codexChatUIConfig.applyModelDefaults(DEFAULT_CODEX_PRIMARY_MODEL, settings);

      expect(settings).toMatchObject({
        providerConfigs: {
          codex: {
            reasoningSummary: 'detailed',
          },
        },
      });
    });
  });

  describe('isDefaultModel', () => {
    it('should return true for built-in models', () => {
      expect(codexChatUIConfig.isDefaultModel(DEFAULT_CODEX_PRIMARY_MODEL)).toBe(true);
      expect(codexChatUIConfig.isDefaultModel('gpt-5.4-mini')).toBe(true);
      expect(codexChatUIConfig.isDefaultModel(CODEX_SPARK_MODEL)).toBe(true);
    });

    it('should return false for custom models', () => {
      expect(codexChatUIConfig.isDefaultModel('my-custom-model')).toBe(false);
    });
  });

  describe('normalizeModelVariant', () => {
    it('falls back unavailable Codex models to the current primary model', () => {
      expect(codexChatUIConfig.normalizeModelVariant('gpt-5.4', {})).toBe(DEFAULT_CODEX_PRIMARY_MODEL);
    });

    it('keeps visible models as-is', () => {
      expect(codexChatUIConfig.normalizeModelVariant(DEFAULT_CODEX_PRIMARY_MODEL, {})).toBe(DEFAULT_CODEX_PRIMARY_MODEL);
      expect(codexChatUIConfig.normalizeModelVariant('custom', {
        environmentVariables: 'OPENAI_MODEL=custom',
      })).toBe('custom');
      expect(codexChatUIConfig.normalizeModelVariant('settings-custom', {
        providerConfigs: {
          codex: {
            customModels: 'settings-custom',
          },
        },
      })).toBe('settings-custom');
    });

    it('normalizes legacy OpenAI-prefixed GPT aliases to Codex model ids', () => {
      expect(codexChatUIConfig.normalizeModelVariant('openai/gpt-5.5', {})).toBe(DEFAULT_CODEX_PRIMARY_MODEL);
      expect(codexChatUIConfig.normalizeModelVariant('openai/gpt-5.4-mini', {})).toBe('gpt-5.4-mini');
      expect(codexChatUIConfig.normalizeModelVariant('openai/gpt-5.3-codex-spark', {})).toBe(CODEX_SPARK_MODEL);
    });
  });

  describe('getCustomModelIds', () => {
    it('should return custom model from env', () => {
      const ids = codexChatUIConfig.getCustomModelIds({ OPENAI_MODEL: 'my-model' });
      expect(ids.has('my-model')).toBe(true);
    });

    it('should not include default models', () => {
      const ids = codexChatUIConfig.getCustomModelIds({ OPENAI_MODEL: DEFAULT_CODEX_PRIMARY_MODEL });
      expect(ids.size).toBe(0);
    });

    it('treats removed GPT-5.5 aliases as legacy custom models', () => {
      const ids = codexChatUIConfig.getCustomModelIds({ OPENAI_MODEL: 'openai/gpt-5.5' });
      expect(ids).toEqual(new Set(['gpt-5.5']));
    });

    it('does not treat OpenAI-prefixed Spark alias as a custom Codex model', () => {
      const ids = codexChatUIConfig.getCustomModelIds({ OPENAI_MODEL: 'openai/gpt-5.3-codex-spark' });
      expect(ids.size).toBe(0);
    });

    it('should return empty set when no OPENAI_MODEL', () => {
      const ids = codexChatUIConfig.getCustomModelIds({});
      expect(ids.size).toBe(0);
    });
  });

  describe('getPermissionModeToggle', () => {
    it('should return yolo/safe toggle config with plan mode', () => {
      const toggle = codexChatUIConfig.getPermissionModeToggle!();
      expect(toggle).toEqual({
        inactiveValue: 'normal',
        inactiveLabel: 'Safe',
        activeValue: 'yolo',
        activeLabel: 'YOLO',
        planValue: 'plan',
        planLabel: 'Plan',
      });
    });
  });

  describe('getServiceTierToggle', () => {
    it('supports Fast tier for every GPT-5.6 primary model', () => {
      for (const model of [
        DEFAULT_CODEX_PRIMARY_MODEL,
        GPT_5_6_SOL_MODEL,
        GPT_5_6_TERRA_MODEL,
        GPT_5_6_LUNA_MODEL,
      ]) {
        expect(codexChatUIConfig.getServiceTierToggle!({ model })).not.toBeNull();
      }
    });

    it('does not expose Fast tier for models without catalog support', () => {
      expect(codexChatUIConfig.getServiceTierToggle!({ model: 'gpt-5.4-mini' })).toBeNull();
    });
  });
});
