import { claudeChatUIConfig } from '@/providers/claude/ui/ClaudeChatUIConfig';
import {
  DEEPSEEK_PROVIDER_ICON,
  KIMI_PROVIDER_ICON,
  OPENAI_PROVIDER_ICON,
  OPENROUTER_PROVIDER_ICON,
} from '@/shared/icons';

describe('claudeChatUIConfig', () => {
  describe('getModelOptions', () => {
    it('appends settings-defined custom models after the built-in options', () => {
      const options = claudeChatUIConfig.getModelOptions({
        providerConfigs: {
          claude: {
            customModels: 'claude-opus-4-6\nclaude-opus-4-6[1m]',
          },
        },
      });

      expect(options.map(option => option.value)).toEqual([
        'haiku',
        'sonnet',
        'opus',
        'claude-opus-4-8',
        'claude-opus-4-6',
        'claude-opus-4-6[1m]',
      ]);
      expect(options.slice(-2)).toEqual([
        {
          value: 'claude-opus-4-6',
          label: 'Opus 4.6',
          description: 'Custom model',
          group: 'Claude',
        },
        {
          value: 'claude-opus-4-6[1m]',
          label: 'Opus 4.6 (1M)',
          description: 'Custom model',
          group: 'Claude',
        },
      ]);
    });

    it('deduplicates settings-defined custom models against exact duplicates', () => {
      const options = claudeChatUIConfig.getModelOptions({
        providerConfigs: {
          claude: {
            customModels: 'haiku\nclaude-opus-4-6\nclaude-opus-4-6\n',
          },
        },
      });

      expect(options.map(option => option.value)).toEqual([
        'haiku',
        'sonnet',
        'opus',
        'claude-opus-4-8',
        'claude-opus-4-6',
      ]);
    });

    it('formats dated settings-defined custom models with shortened date tags', () => {
      const options = claudeChatUIConfig.getModelOptions({
        providerConfigs: {
          claude: {
            customModels: 'claude-opus-4-5-20251101',
          },
        },
      });

      expect(options.at(-1)).toEqual({
        value: 'claude-opus-4-5-20251101',
        label: 'Opus 4.5 (2511)',
        description: 'Custom model',
        group: 'Claude',
      });
    });

    it('uses custom model aliases for settings-defined custom model labels', () => {
      const options = claudeChatUIConfig.getModelOptions({
        customModelAliases: {
          'claude-opus-4-6': 'Work Opus',
        },
        providerConfigs: {
          claude: {
            customModels: 'claude-opus-4-6',
          },
        },
      });

      expect(options.at(-1)).toEqual({
        value: 'claude-opus-4-6',
        label: 'Work Opus',
        description: 'Custom model',
        group: 'Claude',
      });
    });

    it('can show only configured custom models when built-in defaults are disabled', () => {
      const options = claudeChatUIConfig.getModelOptions({
        customModelAliases: {
          'openai/gpt-5.5': 'GPT-5.5',
          'kimi-k3[1m]': 'Kimi K3',
        },
        providerConfigs: {
          claude: {
            showDefaultModels: false,
            customModels: 'openai/gpt-5.5\nkimi-k3[1m]',
          },
        },
      });

      expect(options).toEqual([
        {
          value: 'openai/gpt-5.5',
          label: 'GPT-5.5',
          description: 'Custom model',
          group: 'GPT',
          providerIcon: OPENAI_PROVIDER_ICON,
        },
        {
          value: 'kimi-k3[1m]',
          label: 'Kimi K3',
          description: 'Custom model',
          group: 'Kimi',
          providerIcon: KIMI_PROVIDER_ICON,
        },
      ]);
    });

    it('hides Codex-backed GPT aliases from Claude options when Codex is enabled', () => {
      const options = claudeChatUIConfig.getModelOptions({
        customModelAliases: {
          'openai/gpt-5.5': 'GPT-5.5',
          'openai/gpt-5.4-mini': 'GPT-5.4 Mini',
          'openai/gpt-5.3-codex-spark': 'GPT-5.3 Spark',
          'kimi-k3[1m]': 'Kimi K3',
        },
        providerConfigs: {
          codex: {
            enabled: true,
          },
          claude: {
            showDefaultModels: false,
            customModels: 'openai/gpt-5.5\nopenai/gpt-5.4-mini\nopenai/gpt-5.3-codex-spark\nkimi-k3[1m]',
          },
        },
      });

      expect(options).toEqual([
        {
          value: 'kimi-k3[1m]',
          label: 'Kimi K3',
          description: 'Custom model',
          group: 'Kimi',
          providerIcon: KIMI_PROVIDER_ICON,
        },
      ]);
    });

    it('uses provider-specific icons for non-Claude custom model ids', () => {
      const options = claudeChatUIConfig.getModelOptions({
        providerConfigs: {
          claude: {
            showDefaultModels: false,
            customModels: 'openai/gpt-5.4-mini\nanthropic/claude-fable-5\nanthropic/claude-opus-4.8\nanthropic/claude-sonnet-5\nanthropic/claude-haiku-4.5\n~anthropic/claude-opus-latest\nkimi-k3[1m]\nopenrouter/fusion\ndeepseek-v4-pro[1m]',
          },
        },
      });

      expect(options.map(option => [option.value, option.providerIcon])).toEqual([
        ['openai/gpt-5.4-mini', OPENAI_PROVIDER_ICON],
        ['deepseek-v4-pro[1m]', DEEPSEEK_PROVIDER_ICON],
        ['kimi-k3[1m]', KIMI_PROVIDER_ICON],
        ['openrouter/fusion', OPENROUTER_PROVIDER_ICON],
        ['anthropic/claude-haiku-4.5', OPENROUTER_PROVIDER_ICON],
        ['anthropic/claude-sonnet-5', OPENROUTER_PROVIDER_ICON],
        ['anthropic/claude-opus-4.8', OPENROUTER_PROVIDER_ICON],
        ['~anthropic/claude-opus-latest', OPENROUTER_PROVIDER_ICON],
        ['anthropic/claude-fable-5', OPENROUTER_PROVIDER_ICON],
      ]);
    });

    it('groups configured gateway models into Claude, OpenRouter, Kimi, DeepSeek, and GPT sections', () => {
      const options = claudeChatUIConfig.getModelOptions({
        customModelAliases: {
          'openai/gpt-5.5': 'GPT-5.5',
          'openai/gpt-5.4-mini': 'GPT-5.4 Mini',
          'anthropic/claude-opus-4.8': 'Opus 4.8',
          'anthropic/claude-sonnet-5': 'Sonnet 5',
          'anthropic/claude-haiku-4.5': 'Haiku 4.5',
          'anthropic/claude-fable-5': 'Fable 5',
          'claude-opus-4-6': 'WoWCode Opus 4.6',
          'anthropic/claude-opus-4.6': 'OpenRouter Opus 4.6',
          'kimi-k3[1m]': 'Kimi K3',
          'kimi-k2.7-code': 'Kimi K2.7 Code',
          'kimi-k2.6': 'Kimi K2.6',
          'openrouter/fusion': 'OpenRouter Fusion',
          '~anthropic/claude-opus-latest': 'Claude Opus Latest',
          '~anthropic/claude-sonnet-latest': 'Claude Sonnet Latest',
          '~anthropic/claude-haiku-latest': 'Claude Haiku Latest',
          'deepseek-v4-flash': 'DeepSeek V4 Flash',
          'deepseek-v4-pro[1m]': 'DeepSeek V4 Pro',
        },
        providerConfigs: {
          claude: {
            showDefaultModels: false,
            customModels: [
              'openai/gpt-5.5',
              'openai/gpt-5.4-mini',
              'anthropic/claude-opus-4.8',
              'anthropic/claude-sonnet-5',
              'anthropic/claude-haiku-4.5',
              'anthropic/claude-fable-5',
              '~anthropic/claude-opus-latest',
              '~anthropic/claude-sonnet-latest',
              '~anthropic/claude-haiku-latest',
              'claude-opus-4-6',
              'anthropic/claude-opus-4.6',
              'kimi-k3[1m]',
              'kimi-k2.7-code',
              'kimi-k2.6',
              'openrouter/fusion',
              'deepseek-v4-flash',
              'deepseek-v4-pro[1m]',
            ].join('\n'),
          },
        },
      });

      expect([...options].reverse().map(option => [option.group, option.label])).toEqual([
        ['Claude', 'WoWCode Opus 4.6'],
        ['OpenRouter', 'Fable 5'],
        ['OpenRouter', 'OpenRouter Opus 4.6'],
        ['OpenRouter', 'Claude Opus Latest'],
        ['OpenRouter', 'Opus 4.8'],
        ['OpenRouter', 'Claude Sonnet Latest'],
        ['OpenRouter', 'Sonnet 5'],
        ['OpenRouter', 'Claude Haiku Latest'],
        ['OpenRouter', 'Haiku 4.5'],
        ['OpenRouter', 'OpenRouter Fusion'],
        ['Kimi', 'Kimi K3'],
        ['Kimi', 'Kimi K2.7 Code'],
        ['Kimi', 'Kimi K2.6'],
        ['DeepSeek', 'DeepSeek V4 Flash'],
        ['DeepSeek', 'DeepSeek V4 Pro'],
        ['GPT', 'GPT-5.5'],
        ['GPT', 'GPT-5.4 Mini'],
      ]);
    });

    it('merges built-in Opus 1M and Opus 4.8 when OpenRouter Opus 4.8 is configured', () => {
      const options = claudeChatUIConfig.getModelOptions({
        providerConfigs: {
          claude: {
            enableOpus1M: true,
            customModels: 'anthropic/claude-opus-4.8',
          },
        },
      });

      expect(options.map(option => option.value)).toEqual([
        'anthropic/claude-opus-4.8',
        'haiku',
        'sonnet',
      ]);
    });

    it('merges built-in Opus 1M and Opus 4.8 when direct Opus 4.8 is configured', () => {
      const options = claudeChatUIConfig.getModelOptions({
        providerConfigs: {
          claude: {
            enableOpus1M: true,
            customModels: 'claude-opus-4-8',
          },
        },
      });

      expect(options.map(option => option.value)).toEqual([
        'haiku',
        'sonnet',
        'claude-opus-4-8',
      ]);
    });

    it('keeps environment-defined custom models as a full override', () => {
      const options = claudeChatUIConfig.getModelOptions({
        providerConfigs: {
          claude: {
            customModels: 'claude-opus-4-6',
            environmentVariables: 'ANTHROPIC_MODEL=claude-sonnet-4-5',
          },
        },
      });

      expect(options).toEqual([
        {
          value: 'claude-sonnet-4-5',
          label: 'Sonnet 4.5',
          description: 'Custom model (model)',
          group: 'Claude',
        },
      ]);
    });

    it('uses custom model aliases for environment-defined custom model labels', () => {
      const options = claudeChatUIConfig.getModelOptions({
        customModelAliases: {
          'claude-sonnet-4-5': 'Gateway Sonnet',
        },
        providerConfigs: {
          claude: {
            environmentVariables: 'ANTHROPIC_MODEL=claude-sonnet-4-5',
          },
        },
      });

      expect(options).toEqual([
        {
          value: 'claude-sonnet-4-5',
          label: 'Gateway Sonnet',
          description: 'Custom model (model)',
          group: 'Claude',
        },
      ]);
    });
  });

  describe('getReasoningOptions', () => {
    it('hides xhigh on models that do not support it', () => {
      const options = claudeChatUIConfig.getReasoningOptions('claude-sonnet-4-5', {});

      expect(options.map(option => option.value)).toEqual(['low', 'medium', 'high', 'max']);
    });

    it('keeps xhigh on supported opus models', () => {
      const options = claudeChatUIConfig.getReasoningOptions('claude-opus-4-8', {});

      expect(options.map(option => option.value)).toEqual(['low', 'medium', 'high', 'xhigh', 'max']);
    });

    it('uses effort options for custom model ids', () => {
      const options = claudeChatUIConfig.getReasoningOptions('custom-model', {});

      expect(options.map(option => option.value)).toEqual(['low', 'medium', 'high', 'max']);
      expect(options.some(option => option.tokens !== undefined)).toBe(false);
    });

    it('shows only real DeepSeek thinking effort levels', () => {
      const options = claudeChatUIConfig.getReasoningOptions('deepseek-v4-pro[1m]', {});

      expect(options.map(option => option.value)).toEqual(['high', 'max']);
      expect(claudeChatUIConfig.isAdaptiveReasoningModel('deepseek-v4-pro[1m]', {})).toBe(true);
    });

    it('shows only real DeepSeek thinking effort levels for the vision experiment', () => {
      const options = claudeChatUIConfig.getReasoningOptions('deepseek-v4-flash-vision-exp', {});

      expect(options.map(option => option.value)).toEqual(['high', 'max']);
      expect(claudeChatUIConfig.isAdaptiveReasoningModel('deepseek-v4-flash-vision-exp', {})).toBe(true);
    });

    it('groups the DeepSeek vision experiment with the official DeepSeek models', () => {
      const options = claudeChatUIConfig.getModelOptions({
        customModelAliases: {
          'deepseek-v4-flash-vision-exp': 'DeepSeek V4 Flash Vision Exp',
        },
        providerConfigs: {
          claude: {
            showDefaultModels: false,
            customModels: 'deepseek-v4-flash-vision-exp',
          },
        },
      });

      expect(options).toEqual([
        {
          value: 'deepseek-v4-flash-vision-exp',
          label: 'DeepSeek V4 Flash Vision Exp',
          description: 'Custom model',
          group: 'DeepSeek',
          providerIcon: DEEPSEEK_PROVIDER_ICON,
        },
      ]);
    });

    it('hides effort options for explicitly non-Claude OpenRouter slugs', () => {
      const options = claudeChatUIConfig.getReasoningOptions('openai/gpt-5.4-mini', {});

      expect(options).toEqual([]);
      expect(claudeChatUIConfig.isAdaptiveReasoningModel('openai/gpt-5.4-mini', {})).toBe(false);
    });
  });

  describe('applyModelDefaults', () => {
    it('clamps stale xhigh effort when switching to a custom sonnet model', () => {
      const settings: Record<string, unknown> = {
        effortLevel: 'xhigh',
        providerConfigs: {},
      };

      claudeChatUIConfig.applyModelDefaults('claude-sonnet-4-5', settings);

      expect(settings.effortLevel).toBe('high');
      expect(settings.lastCustomModel).toBe('claude-sonnet-4-5');
    });

    it('preserves xhigh on custom opus models that support it', () => {
      const settings: Record<string, unknown> = {
        effortLevel: 'xhigh',
        providerConfigs: {},
      };

      claudeChatUIConfig.applyModelDefaults('anthropic/claude-opus-4.8', settings);

      expect(settings.effortLevel).toBe('xhigh');
    });

    it('clamps stale low and xhigh DeepSeek effort to high', () => {
      const settings: Record<string, unknown> = {
        effortLevel: 'low',
        providerConfigs: {},
      };

      claudeChatUIConfig.applyModelDefaults('deepseek-v4-pro[1m]', settings);

      expect(settings.effortLevel).toBe('high');

      settings.effortLevel = 'xhigh';
      claudeChatUIConfig.applyModelDefaults('deepseek-v4-pro[1m]', settings);

      expect(settings.effortLevel).toBe('high');
    });
  });
});
