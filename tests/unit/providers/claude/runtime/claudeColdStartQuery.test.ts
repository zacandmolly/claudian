import * as sdkModule from '@anthropic-ai/claude-agent-sdk';

import { type ColdStartQueryConfig, runColdStartQuery } from '@/providers/claude/runtime/claudeColdStartQuery';

const sdkMock = sdkModule as unknown as {
  setMockMessages: (messages: any[], options?: { appendResult?: boolean }) => void;
  resetMockMessages: () => void;
  simulateCrash: (afterChunks?: number) => void;
  getLastOptions: () => sdkModule.Options | undefined;
};

// --- Mocks ---

jest.mock('@/utils/path', () => ({
  getVaultPath: jest.fn().mockReturnValue('/test/vault'),
}));

jest.mock('@/utils/env', () => ({
  parseEnvironmentVariables: jest.fn().mockReturnValue({ PATH: '/usr/bin' }),
  getEnhancedPath: jest.fn().mockReturnValue('/usr/bin:/mock/bin'),
  getMissingNodeError: jest.fn().mockReturnValue(null),
  findNodeExecutable: jest.fn().mockReturnValue('/usr/bin/node'),
}));

jest.mock('@/core/providers/ProviderSettingsCoordinator', () => ({
  ProviderSettingsCoordinator: {
    getProviderSettingsSnapshot: jest.fn().mockReturnValue({
      model: 'claude-sonnet-4-5',
      thinkingBudget: 'off',
      effortLevel: 'medium',
      loadUserClaudeSettings: false,
    }),
  },
}));

const { getVaultPath } = jest.requireMock('@/utils/path');
const { getMissingNodeError, parseEnvironmentVariables } = jest.requireMock('@/utils/env');

function createMockPlugin(overrides?: Partial<ColdStartQueryConfig['plugin']>) {
  return {
    app: {},
    settings: {},
    getResolvedProviderCliPath: jest.fn().mockReturnValue('/mock/claude'),
    getActiveEnvironmentVariables: jest.fn().mockReturnValue(''),
    ...overrides,
  } as unknown as ColdStartQueryConfig['plugin'];
}

function createConfig(overrides?: Partial<ColdStartQueryConfig>): ColdStartQueryConfig {
  return {
    plugin: createMockPlugin(),
    systemPrompt: 'Test system prompt',
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  sdkMock.resetMockMessages();
  (getVaultPath as jest.Mock).mockReturnValue('/test/vault');
  (getMissingNodeError as jest.Mock).mockReturnValue(null);
  (parseEnvironmentVariables as jest.Mock).mockReturnValue({ PATH: '/usr/bin' });
});

describe('runColdStartQuery', () => {
  describe('happy path', () => {
    it('returns accumulated text and session ID', async () => {
      sdkMock.setMockMessages([
        { type: 'system', subtype: 'init', session_id: 'sess-42' },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Hello ' }] } },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'World' }] } },
      ]);

      const result = await runColdStartQuery(createConfig(), 'hi');

      expect(result.text).toBe('Hello World');
      expect(result.sessionId).toBe('sess-42');
    });

    it('returns null sessionId when no init event', async () => {
      sdkMock.setMockMessages([
        { type: 'assistant', message: { content: [{ type: 'text', text: 'answer' }] } },
      ]);

      const result = await runColdStartQuery(createConfig(), 'hi');

      expect(result.sessionId).toBeNull();
    });

    it('ignores non-assistant SDK messages with string message payloads', async () => {
      sdkMock.setMockMessages([
        { type: 'permission_denied', message: 'Permission denied' },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'answer' }] } },
      ]);

      const result = await runColdStartQuery(createConfig(), 'hi');

      expect(result.text).toBe('answer');
    });
  });

  describe('infrastructure errors', () => {
    it('throws when vault path is null', async () => {
      (getVaultPath as jest.Mock).mockReturnValue(null);

      await expect(
        runColdStartQuery(createConfig(), 'hi')
      ).rejects.toThrow('Could not determine vault path');
    });

    it('throws when CLI path is null', async () => {
      const plugin = createMockPlugin({
        getResolvedProviderCliPath: jest.fn().mockReturnValue(null),
      });

      await expect(
        runColdStartQuery(createConfig({ plugin }), 'hi')
      ).rejects.toThrow('Claude CLI not found');
    });

    it('throws when node is missing', async () => {
      (getMissingNodeError as jest.Mock).mockReturnValue('Node.js not found');

      await expect(
        runColdStartQuery(createConfig(), 'hi')
      ).rejects.toThrow('Node.js not found');
    });
  });

  describe('SDK options', () => {
    it('passes system prompt, tools, and model to SDK', async () => {
      sdkMock.setMockMessages([
        { type: 'system', subtype: 'init', session_id: 'sess' },
      ]);

      await runColdStartQuery(
        createConfig({
          systemPrompt: 'Custom prompt',
          tools: [],
          model: 'claude-haiku-4-5',
        }),
        'hi',
      );

      const opts = sdkMock.getLastOptions();
      expect(opts?.systemPrompt).toBe('Custom prompt');
      expect(opts?.tools).toEqual([]);
      expect(opts?.model).toBe('claude-haiku-4-5');
      expect(opts?.permissionMode).toBe('bypassPermissions');
      expect(opts?.allowDangerouslySkipPermissions).toBe(true);
    });

    it('passes hooks to SDK', async () => {
      const hooks = { PreToolUse: [{ hooks: [jest.fn()] }] };
      sdkMock.setMockMessages([]);

      await runColdStartQuery(createConfig({ hooks }), 'hi');

      const opts = sdkMock.getLastOptions();
      expect(opts?.hooks).toBe(hooks);
    });

    it('passes auto mode opt-in when Claude safe mode is auto', async () => {
      sdkMock.setMockMessages([]);

      await runColdStartQuery(
        createConfig({
          providerSettings: {
            model: 'claude-sonnet-4-5',
            thinkingBudget: 'off',
            effortLevel: 'medium',
            loadUserClaudeSettings: false,
            providerConfigs: {
              claude: {
                safeMode: 'auto',
              },
            },
          },
        }),
        'hi',
      );

      expect(sdkMock.getLastOptions()?.extraArgs).toEqual({ 'enable-auto-mode': null });
    });

    it('sets persistSession false when configured', async () => {
      sdkMock.setMockMessages([]);

      await runColdStartQuery(createConfig({ persistSession: false }), 'hi');

      const opts = sdkMock.getLastOptions();
      expect(opts?.persistSession).toBe(false);
    });

    it('sets resume when resumeSessionId provided', async () => {
      sdkMock.setMockMessages([]);

      await runColdStartQuery(
        createConfig({ resumeSessionId: 'old-sess' }),
        'hi',
      );

      const opts = sdkMock.getLastOptions();
      expect(opts?.resume).toBe('old-sess');
    });

    it('does not set thinking when disabled', async () => {
      sdkMock.setMockMessages([]);

      await runColdStartQuery(
        createConfig({ thinking: { disabled: true } }),
        'hi',
      );

      const opts = sdkMock.getLastOptions();
      expect(opts?.thinking).toBeUndefined();
      expect(opts?.effort).toBeUndefined();
      expect(opts?.maxThinkingTokens).toBeUndefined();
    });

    it('does not set adaptive thinking for explicitly non-Claude OpenRouter slugs', async () => {
      sdkMock.setMockMessages([]);

      await runColdStartQuery(
        createConfig({
          model: 'moonshotai/kimi-k2.7-code',
        }),
        'hi',
      );

      const opts = sdkMock.getLastOptions();
      expect(opts?.model).toBe('moonshotai/kimi-k2.7-code');
      expect(opts?.thinking).toBeUndefined();
      expect(opts?.effort).toBeUndefined();
      expect(opts?.maxThinkingTokens).toBeUndefined();
    });

    it('routes OpenRouter group models to the OpenRouter snippet environment', async () => {
      sdkMock.setMockMessages([]);
      (parseEnvironmentVariables as jest.Mock).mockImplementation((text: string) => {
        if (text.includes('openrouter.ai')) {
          return {
            ANTHROPIC_BASE_URL: 'https://openrouter.ai/api',
            ANTHROPIC_AUTH_TOKEN: 'openrouter-token',
            ANTHROPIC_API_KEY: '',
          };
        }
        return {
          PATH: '/usr/bin',
          ANTHROPIC_BASE_URL: 'https://wowcode.cc/',
          ANTHROPIC_AUTH_TOKEN: 'wowcode-token',
        };
      });

      await runColdStartQuery(
        createConfig({
          providerSettings: {
            model: '~anthropic/claude-haiku-latest',
            envSnippets: [
              {
                id: 'claude-openrouter-official',
                name: 'OpenRouter official route',
                description: 'OpenRouter route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://openrouter.ai/api\nANTHROPIC_AUTH_TOKEN=openrouter-token\nANTHROPIC_API_KEY=',
              },
            ],
          },
        }),
        'hi',
      );

      const opts = sdkMock.getLastOptions();
      expect(opts?.model).toBe('~anthropic/claude-haiku-latest');
      expect(opts?.env?.ANTHROPIC_BASE_URL).toBe('https://openrouter.ai/api');
      expect(opts?.env?.ANTHROPIC_AUTH_TOKEN).toBe('openrouter-token');
      expect(opts?.thinking).toEqual({ type: 'adaptive' });
      expect(opts?.effort).toBe('high');
    });

    it('routes OpenRouter Fable 5 to the OpenRouter snippet environment', async () => {
      sdkMock.setMockMessages([]);
      (parseEnvironmentVariables as jest.Mock).mockImplementation((text: string) => {
        if (text.includes('openrouter.ai')) {
          return {
            ANTHROPIC_BASE_URL: 'https://openrouter.ai/api',
            ANTHROPIC_AUTH_TOKEN: 'openrouter-token',
            ANTHROPIC_API_KEY: '',
          };
        }
        return {
          PATH: '/usr/bin',
          ANTHROPIC_BASE_URL: 'https://wowcode.cc/',
          ANTHROPIC_AUTH_TOKEN: 'wowcode-token',
        };
      });

      await runColdStartQuery(
        createConfig({
          providerSettings: {
            model: 'anthropic/claude-fable-5',
            envSnippets: [
              {
                id: 'claude-openrouter-official',
                name: 'OpenRouter official route',
                description: 'OpenRouter route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://openrouter.ai/api\nANTHROPIC_AUTH_TOKEN=openrouter-token\nANTHROPIC_API_KEY=',
              },
            ],
          },
        }),
        'hi',
      );

      const opts = sdkMock.getLastOptions();
      expect(opts?.model).toBe('anthropic/claude-fable-5');
      expect(opts?.env?.ANTHROPIC_BASE_URL).toBe('https://openrouter.ai/api');
      expect(opts?.env?.ANTHROPIC_AUTH_TOKEN).toBe('openrouter-token');
      expect(opts?.thinking).toEqual({ type: 'adaptive' });
      expect(opts?.effort).toBe('high');
    });

    it('sets adaptive thinking for Anthropic slugs routed through OpenRouter', async () => {
      sdkMock.setMockMessages([]);
      (parseEnvironmentVariables as jest.Mock).mockReturnValue({
        PATH: '/usr/bin',
        ANTHROPIC_BASE_URL: 'https://openrouter.ai/api',
      });

      await runColdStartQuery(
        createConfig({
          providerSettings: {
            model: 'anthropic/claude-opus-4.8',
            thinkingBudget: 'high',
            effortLevel: 'max',
          },
        }),
        'hi',
      );

      const opts = sdkMock.getLastOptions();
      expect(opts?.model).toBe('anthropic/claude-opus-4.8');
      expect(opts?.thinking).toEqual({ type: 'adaptive' });
      expect(opts?.effort).toBe('max');
      expect(opts?.maxThinkingTokens).toBeUndefined();
    });

    it('uses provider settings model when no override', async () => {
      sdkMock.setMockMessages([]);

      await runColdStartQuery(createConfig(), 'hi');

      const opts = sdkMock.getLastOptions();
      expect(opts?.model).toBe('claude-sonnet-4-5');
    });

    it('normalizes the DeepSeek local 1M marker before calling the SDK', async () => {
      sdkMock.setMockMessages([]);
      (parseEnvironmentVariables as jest.Mock).mockImplementation((text: string) => {
        if (text.includes('api.deepseek.com')) {
          return {
            PATH: '/usr/bin',
            ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
            ANTHROPIC_MODEL: 'deepseek-v4-pro[1m]',
          };
        }
        return { PATH: '/usr/bin' };
      });

      await runColdStartQuery(
        createConfig({
          model: 'deepseek-v4-pro[1m]',
          providerSettings: {
            model: 'deepseek-v4-pro[1m]',
            effortLevel: 'high',
            envSnippets: [{
              id: 'claude-deepseek-v4',
              name: 'DeepSeek V4 Pro',
              description: 'DeepSeek route',
              scope: 'provider:claude',
              envVars: 'ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic\nANTHROPIC_MODEL=deepseek-v4-pro[1m]',
            }],
          },
        }),
        'hi',
      );

      const opts = sdkMock.getLastOptions();
      expect(opts?.model).toBe('deepseek-v4-pro');
      expect(opts?.env?.ANTHROPIC_MODEL).toBe('deepseek-v4-pro');
    });

    it('loads project and local settings when user settings are disabled', async () => {
      sdkMock.setMockMessages([]);

      await runColdStartQuery(
        createConfig({
          providerSettings: {
            model: 'claude-sonnet-4-5',
            thinkingBudget: 'off',
            effortLevel: 'medium',
            loadUserClaudeSettings: false,
          },
        }),
        'hi',
      );

      expect(sdkMock.getLastOptions()?.settingSources).toEqual(['project', 'local']);
    });

    it('loads user, project, and local settings when user settings are enabled', async () => {
      sdkMock.setMockMessages([]);

      await runColdStartQuery(
        createConfig({
          providerSettings: {
            model: 'claude-sonnet-4-5',
            thinkingBudget: 'off',
            effortLevel: 'medium',
            loadUserClaudeSettings: true,
          },
        }),
        'hi',
      );

      expect(sdkMock.getLastOptions()?.settingSources).toEqual(['user', 'project', 'local']);
    });

    it('clamps unsupported xhigh effort before calling the SDK', async () => {
      sdkMock.setMockMessages([]);

      await runColdStartQuery(
        createConfig({
          providerSettings: {
            model: 'claude-sonnet-4-5',
            thinkingBudget: 'off',
            effortLevel: 'xhigh',
            loadUserClaudeSettings: false,
          },
        }),
        'hi',
      );

      const opts = sdkMock.getLastOptions();
      expect(opts?.effort).toBe('high');
    });
  });

  describe('abort handling', () => {
    it('throws Cancelled when aborted mid-stream', async () => {
      const abortController = new AbortController();

      sdkMock.setMockMessages([
        { type: 'system', subtype: 'init', session_id: 'sess' },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'partial' }] } },
      ]);

      // Abort before the query starts (signal will be checked on first iteration)
      abortController.abort();

      await expect(
        runColdStartQuery(createConfig({ abortController }), 'hi')
      ).rejects.toThrow('Cancelled');
    });
  });

  describe('SDK errors', () => {
    it('propagates SDK errors', async () => {
      sdkMock.simulateCrash(0);

      await expect(
        runColdStartQuery(createConfig(), 'hi')
      ).rejects.toThrow('Simulated consumer crash');
    });
  });

  describe('onTextChunk callback', () => {
    it('calls onTextChunk with accumulated text', async () => {
      const chunks: string[] = [];
      sdkMock.setMockMessages([
        { type: 'system', subtype: 'init', session_id: 'sess' },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Hello ' }] } },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'World' }] } },
      ]);

      await runColdStartQuery(
        createConfig({ onTextChunk: (text) => chunks.push(text) }),
        'hi',
      );

      expect(chunks).toEqual(['Hello ', 'Hello World']);
    });
  });
});
