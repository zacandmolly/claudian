import {
  normalizeClaudeRuntimeModelId,
  resolveClaudeModelEnvironment,
  usesModelScopedClaudeEnvironment,
} from '@/providers/claude/env/modelEnvironment';

const SECRET = 'test-secret-that-must-not-leak';

function snippet(
  id: string,
  name: string,
  envVars: string,
  scope: 'shared' | 'provider:claude' = 'provider:claude',
) {
  return { id, name, description: '', envVars, scope };
}

describe('Claude model environments', () => {
  it('keeps the baseline environment for native Claude models', () => {
    const result = resolveClaudeModelEnvironment(
      { envSnippets: [] },
      'ANTHROPIC_BASE_URL=https://pool.example\nPATH=/base/bin',
      'claude-opus-4-8',
    );

    expect(result.environment).toEqual({
      ANTHROPIC_BASE_URL: 'https://pool.example',
      PATH: '/base/bin',
    });
    expect(result.routeSnippetId).toBeUndefined();
  });

  it('selects the DeepSeek route, strips only its local context marker, and hashes secrets', () => {
    const result = resolveClaudeModelEnvironment(
      {
        envSnippets: [snippet(
          'claude-deepseek-v4',
          'DeepSeek route',
          [
            'ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic',
            `ANTHROPIC_AUTH_TOKEN=${SECRET}`,
            'ANTHROPIC_MODEL=deepseek-v4-pro[1m]',
          ].join('\n'),
        )],
      },
      'PATH=/base/bin',
      'deepseek-v4-flash[1m]',
    );

    expect(normalizeClaudeRuntimeModelId('deepseek-v4-flash[1m]'))
      .toBe('deepseek-v4-flash');
    expect(result.environment).toEqual(expect.objectContaining({
      ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      ANTHROPIC_AUTH_TOKEN: SECRET,
      ANTHROPIC_MODEL: 'deepseek-v4-flash',
    }));
    expect(result.routeSnippetId).toBe('claude-deepseek-v4');
    expect(result.fingerprint).toMatch(/^runtime-input:v1:[0-9a-f]{64}$/);
    expect(result.fingerprint).not.toContain(SECRET);
  });

  it('adds Kimi model and context overrides without changing its runtime model id', () => {
    const result = resolveClaudeModelEnvironment(
      {
        envSnippets: [snippet(
          'claude-kimi-official',
          'Kimi official',
          'ANTHROPIC_BASE_URL=https://api.moonshot.cn/anthropic',
        )],
      },
      '',
      'kimi-k3[1m]',
    );

    expect(result.environment).toEqual(expect.objectContaining({
      ANTHROPIC_MODEL: 'kimi-k3[1m]',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'kimi-k3[1m]',
      CLAUDE_CODE_AUTO_COMPACT_WINDOW: '1048576',
      ENABLE_TOOL_SEARCH: 'false',
    }));

    const qualified = resolveClaudeModelEnvironment(
      { envSnippets: [] },
      '',
      'moonshotai/kimi-k3[1m]',
    );
    expect(qualified.environment.CLAUDE_CODE_AUTO_COMPACT_WINDOW).toBe('1048576');
  });

  it('ignores matching snippets outside the Claude provider scope', () => {
    const result = resolveClaudeModelEnvironment(
      {
        envSnippets: [snippet(
          'claude-openrouter-official',
          'OpenRouter',
          'ANTHROPIC_BASE_URL=https://openrouter.ai/api',
          'shared',
        )],
      },
      'ANTHROPIC_BASE_URL=https://pool.example',
      'anthropic/claude-opus-4.8',
    );

    expect(result.environment.ANTHROPIC_BASE_URL).toBe('https://pool.example');
    expect(result.routeSnippetId).toBeUndefined();
  });

  it('changes the opaque fingerprint when route credentials change', () => {
    const settings = (token: string) => ({
      envSnippets: [snippet(
        'claude-deepseek-v4',
        'DeepSeek',
        `ANTHROPIC_AUTH_TOKEN=${token}`,
      )],
    });

    const first = resolveClaudeModelEnvironment(settings('token-a'), '', 'deepseek-v4-pro');
    const second = resolveClaudeModelEnvironment(settings('token-b'), '', 'deepseek-v4-pro');

    expect(first.fingerprint).not.toBe(second.fingerprint);
    expect(usesModelScopedClaudeEnvironment('deepseek-v4-pro')).toBe(true);
    expect(usesModelScopedClaudeEnvironment('openrouter/fusion')).toBe(true);
    expect(usesModelScopedClaudeEnvironment('claude-opus-4-8')).toBe(false);
  });

  it('keeps native Claude model switches on one route but fences routed model switches', () => {
    const base = 'ANTHROPIC_BASE_URL=https://pool.example';
    const nativeOpus = resolveClaudeModelEnvironment({}, base, 'claude-opus-4-8');
    const nativeSonnet = resolveClaudeModelEnvironment({}, base, 'claude-sonnet-5');
    const routedSettings = {
      envSnippets: [snippet(
        'claude-deepseek-v4',
        'DeepSeek',
        'ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic',
      )],
    };
    const deepSeekFlash = resolveClaudeModelEnvironment(
      routedSettings,
      base,
      'deepseek-v4-flash',
    );
    const deepSeekPro = resolveClaudeModelEnvironment(
      routedSettings,
      base,
      'deepseek-v4-pro',
    );

    expect(nativeOpus.fingerprint).toBe(nativeSonnet.fingerprint);
    expect(deepSeekFlash.fingerprint).not.toBe(deepSeekPro.fingerprint);
  });
});
