import {
  getClaudeModelMenuOptions,
  getClaudeModelOptions,
} from '@/providers/claude/modelOptions';
import {
  DEEPSEEK_PROVIDER_ICON,
  KIMI_PROVIDER_ICON,
  OPENAI_PROVIDER_ICON,
  OPENROUTER_PROVIDER_ICON,
} from '@/shared/icons';

describe('getClaudeModelOptions', () => {
  it('keeps hidden defaults hidden while adding provider-qualified menu metadata', () => {
    const settings = {
      providerConfigs: {
        claude: {
          showDefaultModels: false,
          customModels: [
            'claude-opus-4.8',
            'openrouter/fusion',
            'moonshotai/kimi-k3',
            'deepseek/deepseek-v4-pro',
            'openai/gpt-5.6-terra',
          ].join('\n'),
        },
      },
    };
    const options = getClaudeModelOptions(settings);

    expect(options.map(option => option.group)).toEqual([
      'Claude',
      'OpenRouter',
      'Kimi',
      'DeepSeek',
      'GPT',
    ]);
    expect(getClaudeModelMenuOptions(settings).map(option => option.group)).toEqual([
      'GPT',
      'DeepSeek',
      'Kimi',
      'OpenRouter',
      'Claude',
    ]);
    expect(options.map(option => option.value)).not.toContain('haiku');

    const byValue = new Map(options.map(option => [option.value, option]));
    expect(byValue.get('claude-code/openai/gpt-5.6-terra')?.providerIcon)
      .toBe(OPENAI_PROVIDER_ICON);
    expect(byValue.get('claude-code/moonshotai/kimi-k3')?.providerIcon)
      .toBe(KIMI_PROVIDER_ICON);
    expect(byValue.get('claude-code/deepseek/deepseek-v4-pro')?.providerIcon)
      .toBe(DEEPSEEK_PROVIDER_ICON);
    expect(byValue.get('claude-code/openrouter/fusion')?.providerIcon)
      .toBe(OPENROUTER_PROVIDER_ICON);
  });

  it('annotates environment-projected models without losing their environment types', () => {
    const options = getClaudeModelOptions({
      providerConfigs: {
        claude: {
          environmentVariables: [
            'ANTHROPIC_MODEL=openai/gpt-5.6-terra',
            'ANTHROPIC_DEFAULT_OPUS_MODEL=deepseek/deepseek-v4-pro',
          ].join('\n'),
        },
      },
    });

    expect(options.find(option => option.value === 'claude-code/openai/gpt-5.6-terra'))
      .toMatchObject({ group: 'GPT', environmentTypes: ['model'] });
    expect(options.find(option => option.value === 'claude-code/deepseek/deepseek-v4-pro'))
      .toMatchObject({ group: 'DeepSeek', environmentTypes: ['opus'] });
  });
});
