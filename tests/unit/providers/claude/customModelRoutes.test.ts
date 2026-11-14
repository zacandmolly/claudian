import type { EnvSnippet } from '@/core/types/settings';
import { resolveClaudeModelEnvironment } from '@/providers/claude/env/modelEnvironment';
import { getClaudeModelOptions } from '@/providers/claude/modelOptions';
import { claudeChatUIConfig } from '@/providers/claude/ui/ClaudeChatUIConfig';

/**
 * Redacted excerpt of a real 2.0.21 vault that still showed every custom model.
 * Tokens are replaced with <redacted>. The 2.2.4 upgrade copied the PoolRouter
 * snippet into provider environment variables and the picker collapsed to Opus 4.6.
 */
const REDACTED_UPGRADED_SETTINGS = {
  customModelAliases: {
    'anthropic/claude-opus-4.6': 'OpenRouter Opus 4.6',
    'kimi-k3[1m]': 'Kimi K3',
    'kimi-k2.7-code': 'Kimi K2.7 Code',
    'kimi-k2.6': 'Kimi K2.6',
    'openrouter/fusion': 'OpenRouter Fusion',
    'claude-opus-4-7': 'PoolRouter Claude Opus 4.7',
    'claude-fable-5': 'PoolRouter Claude Fable 5',
    'claude-opus-4-6': 'PoolRouter · Opus 4.6',
    'claude-opus-4-8': 'PoolRouter Claude Opus 4.8',
    'anthropic/claude-sonnet-5': 'OpenRouter Sonnet 5',
    'anthropic/claude-haiku-4.5': 'OpenRouter Haiku 4.5',
    'anthropic/claude-fable-5.1': 'OpenRouter · Fable 5.1',
    'deepseek-flash': 'DeepSeek 官方 · V4.1 Flash',
    'anthropic/claude-opus-5.5': 'OpenRouter Opus 5.5',
  },
  customContextLimits: {
    'claude-opus-4-6': 1_000_000,
  },
  envSnippets: [
    {
      id: 'claude-poolrouter',
      name: 'PoolRouter · Claude Opus 4.6',
      description: '',
      envVars: [
        'ANTHROPIC_BASE_URL=https://poolrouter.com',
        'ANTHROPIC_AUTH_TOKEN=<redacted>',
        'ANTHROPIC_MODEL=claude-opus-4-6',
        'ANTHROPIC_DEFAULT_OPUS_MODEL=claude-opus-4-6',
      ].join('\n'),
      scope: 'provider:claude' as const,
    },
    {
      id: 'claude-deepseek-v4',
      name: 'DeepSeek 官方 · V4.1 Flash',
      description: '',
      envVars: [
        'ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic',
        'ANTHROPIC_AUTH_TOKEN=<redacted>',
        'ANTHROPIC_MODEL=deepseek-flash',
      ].join('\n'),
      scope: 'provider:claude' as const,
      contextLimits: { 'deepseek-flash': 1_048_576 },
      modelAliases: { 'deepseek-flash': 'DeepSeek 官方 · V4.1 Flash' },
    },
    {
      id: 'claude-openrouter-official',
      name: 'OpenRouter · Claude Fable 5.1（新模型）',
      description: '',
      envVars: [
        'ANTHROPIC_BASE_URL=https://openrouter.ai/api',
        'ANTHROPIC_AUTH_TOKEN=<redacted>',
        'ANTHROPIC_MODEL=anthropic/claude-fable-5.1',
      ].join('\n'),
      scope: 'provider:claude' as const,
      contextLimits: { 'anthropic/claude-opus-5.5': 1_000_000 },
    },
    {
      id: 'claude-kimi-official',
      name: 'Kimi official route',
      description: '',
      envVars: [
        'ANTHROPIC_BASE_URL=https://api.moonshot.cn/anthropic',
        'ANTHROPIC_AUTH_TOKEN=<redacted>',
      ].join('\n'),
      scope: 'provider:claude' as const,
      contextLimits: {
        'kimi-k3[1m]': 1_048_576,
        'kimi-k2.6': 262_144,
      },
    },
  ] as EnvSnippet[],
  providerConfigs: {
    claude: {
      showDefaultModels: false,
      customModels: [
        'claude-opus-4-7',
        'claude-fable-5',
        'claude-opus-4-6',
        'claude-opus-4-8',
        'anthropic/claude-opus-4.6',
        'anthropic/claude-opus-5.5',
        'anthropic/claude-sonnet-5',
        'anthropic/claude-haiku-4.5',
        'openrouter/fusion',
        'kimi-k3[1m]',
        'kimi-k2.7-code',
        'kimi-k2.6',
        'anthropic/claude-fable-5.1',
        'deepseek-flash',
      ].join('\n'),
      environmentVariables: [
        'ANTHROPIC_BASE_URL=https://poolrouter.com',
        'ANTHROPIC_AUTH_TOKEN=<redacted>',
        'ANTHROPIC_MODEL=claude-opus-4-6',
        'ANTHROPIC_DEFAULT_OPUS_MODEL=claude-opus-4-6',
      ].join('\n'),
    },
  },
  claudeModelRoutes: {
    'claude-opus-4-6': 'claude-poolrouter',
    'anthropic/claude-fable-5.1': 'claude-openrouter-official',
    'deepseek-flash': 'claude-deepseek-v4',
    'anthropic/claude-opus-5.5': 'claude-openrouter-official',
  },
};

function runtimeId(value: string): string {
  return value.replace(/^claude-code\//, '');
}

describe('upgraded Claude custom model menu', () => {
  it('keeps every configured custom model visible with its alias when the provider env sets one model', () => {
    const options = getClaudeModelOptions(REDACTED_UPGRADED_SETTINGS);
    const labels = new Map(options.map(option => [runtimeId(option.value), option.label]));

    expect(labels).toEqual(new Map(Object.entries({
      'claude-opus-4-7': 'PoolRouter Claude Opus 4.7',
      'claude-fable-5': 'PoolRouter Claude Fable 5',
      'claude-opus-4-6': 'PoolRouter · Opus 4.6',
      'claude-opus-4-8': 'PoolRouter Claude Opus 4.8',
      'anthropic/claude-opus-4.6': 'OpenRouter Opus 4.6',
      'anthropic/claude-opus-5.5': 'OpenRouter Opus 5.5',
      'anthropic/claude-sonnet-5': 'OpenRouter Sonnet 5',
      'anthropic/claude-haiku-4.5': 'OpenRouter Haiku 4.5',
      'openrouter/fusion': 'OpenRouter Fusion',
      'kimi-k3[1m]': 'Kimi K3',
      'kimi-k2.7-code': 'Kimi K2.7 Code',
      'kimi-k2.6': 'Kimi K2.6',
      'anthropic/claude-fable-5.1': 'OpenRouter · Fable 5.1',
      'deepseek-flash': 'DeepSeek 官方 · V4.1 Flash',
    })));
    expect(options.map(option => option.value)).not.toContain('haiku');
    expect(options.map(option => option.value)).not.toContain('opus');
  });

  it('routes each custom model through its claudeModelRoutes snippet and context limit', () => {
    const deepseek = resolveClaudeModelEnvironment(
      REDACTED_UPGRADED_SETTINGS,
      REDACTED_UPGRADED_SETTINGS.providerConfigs.claude.environmentVariables,
      'deepseek-flash',
    );
    expect(deepseek.routeSnippetId).toBe('claude-deepseek-v4');
    expect(deepseek.environment.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic');
    expect(deepseek.environment.ANTHROPIC_MODEL).toBe('deepseek-flash');
    expect(claudeChatUIConfig.getContextWindowSize(
      'deepseek-flash',
      {},
      REDACTED_UPGRADED_SETTINGS,
    )).toBe(1_048_576);

    const opus55 = resolveClaudeModelEnvironment(
      REDACTED_UPGRADED_SETTINGS,
      REDACTED_UPGRADED_SETTINGS.providerConfigs.claude.environmentVariables,
      'anthropic/claude-opus-5.5',
    );
    expect(opus55.routeSnippetId).toBe('claude-openrouter-official');
    expect(opus55.environment.ANTHROPIC_BASE_URL).toBe('https://openrouter.ai/api');
    expect(opus55.environment.ANTHROPIC_MODEL).toBe('anthropic/claude-opus-5.5');
    expect(claudeChatUIConfig.getContextWindowSize(
      'anthropic/claude-opus-5.5',
      {},
      REDACTED_UPGRADED_SETTINGS,
    )).toBe(1_000_000);

    const pool = resolveClaudeModelEnvironment(
      REDACTED_UPGRADED_SETTINGS,
      REDACTED_UPGRADED_SETTINGS.providerConfigs.claude.environmentVariables,
      'claude-opus-4-6',
    );
    expect(pool.routeSnippetId).toBe('claude-poolrouter');
    expect(pool.environment.ANTHROPIC_BASE_URL).toBe('https://poolrouter.com');
    expect(pool.environment.ANTHROPIC_MODEL).toBe('claude-opus-4-6');
    expect(claudeChatUIConfig.getContextWindowSize(
      'claude-opus-4-6',
      REDACTED_UPGRADED_SETTINGS.customContextLimits,
      REDACTED_UPGRADED_SETTINGS,
    )).toBe(1_000_000);

    const kimi = resolveClaudeModelEnvironment(
      REDACTED_UPGRADED_SETTINGS,
      '',
      'kimi-k2.6',
    );
    expect(kimi.routeSnippetId).toBe('claude-kimi-official');
    expect(kimi.environment.ANTHROPIC_BASE_URL).toBe('https://api.moonshot.cn/anthropic');
    expect(claudeChatUIConfig.getContextWindowSize(
      'kimi-k2.6',
      {},
      REDACTED_UPGRADED_SETTINGS,
    )).toBe(262_144);
  });
});
