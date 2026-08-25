import type { ClaudianSettings } from '@/core/types/settings';
import type { QueryOptionsContext } from '@/providers/claude/runtime/ClaudeQueryOptionsBuilder';
import { QueryOptionsBuilder } from '@/providers/claude/runtime/ClaudeQueryOptionsBuilder';
import type { PersistentQueryConfig } from '@/providers/claude/runtime/types';

// Create a mock MCP server manager
function createMockMcpManager() {
  return {
    loadServers: jest.fn().mockResolvedValue(undefined),
    getServers: jest.fn().mockReturnValue([]),
    getEnabledCount: jest.fn().mockReturnValue(0),
    getActiveServers: jest.fn().mockReturnValue({}),
    getDisallowedMcpTools: jest.fn().mockReturnValue([]),
    getAllDisallowedMcpTools: jest.fn().mockReturnValue([]),
    hasServers: jest.fn().mockReturnValue(false),
  } as any;
}

// Create a mock plugin manager
function createMockPluginManager() {
  return {
    setEnabledPluginIds: jest.fn(),
    loadPlugins: jest.fn().mockResolvedValue(undefined),
    getPlugins: jest.fn().mockReturnValue([]),
    getUnavailableEnabledPlugins: jest.fn().mockReturnValue([]),
    hasEnabledPlugins: jest.fn().mockReturnValue(false),
    getEnabledCount: jest.fn().mockReturnValue(0),
    getPluginsKey: jest.fn().mockReturnValue(''),
    togglePlugin: jest.fn().mockReturnValue([]),
    enablePlugin: jest.fn().mockReturnValue([]),
    disablePlugin: jest.fn().mockReturnValue([]),
    hasPlugins: jest.fn().mockReturnValue(false),
  } as any;
}

// Create a mock settings object
function createMockSettings(overrides: Partial<ClaudianSettings> = {}): ClaudianSettings {
  return {
    permissions: [],
    permissionMode: 'yolo',
    claudeSafeMode: 'acceptEdits',
    codexSafeMode: 'workspace-write',
    loadUserClaudeSettings: false,
    mediaFolder: '',
    systemPrompt: '',
    model: 'claude-sonnet-4-5',
    thinkingBudget: 'off',
    titleGenerationModel: '',
    excludedTags: [],
    environmentVariables: '',
    envSnippets: [],
    keyboardNavigation: {
      scrollUpKey: 'k',
      scrollDownKey: 'j',
      focusInputKey: 'i',
    },
    claudeCliPath: '',
    enableChrome: false,
    ...overrides,
  } as ClaudianSettings;
}

function createMockPersistentQueryConfig(
  overrides: Partial<PersistentQueryConfig> = {}
): PersistentQueryConfig {
  return {
    model: 'sonnet',
    effortLevel: 'high',
    permissionMode: 'yolo',
    sdkPermissionMode: 'bypassPermissions',
    systemPromptKey: 'key1',
    disallowedToolsKey: '',
    mcpServersKey: '',
    pluginsKey: '',
    environmentKey: '',
    externalContextPaths: [],
    adaptiveThinking: true,
    settingSources: 'project,local',
    claudeCliPath: '/mock/claude',
    enableChrome: false,
    enableAutoMode: false,
    ...overrides,
  };
}

// Create a base context for tests
function createMockContext(overrides: Partial<QueryOptionsContext> = {}): QueryOptionsContext {
  return {
    vaultPath: '/test/vault',
    cliPath: '/mock/claude',
    settings: createMockSettings(),
    customEnv: {},
    enhancedPath: '/usr/bin:/mock/bin',
    mcpManager: createMockMcpManager(),
    pluginManager: createMockPluginManager(),
    ...overrides,
  };
}

describe('QueryOptionsBuilder', () => {
  describe('needsRestart', () => {
    it('returns true when currentConfig is null', () => {
      const newConfig = createMockPersistentQueryConfig();
      expect(QueryOptionsBuilder.needsRestart(null, newConfig)).toBe(true);
    });

    it('returns false when configs are identical', () => {
      const config = createMockPersistentQueryConfig();
      expect(QueryOptionsBuilder.needsRestart(config, { ...config })).toBe(false);
    });

    it('returns true when systemPromptKey changes', () => {
      const currentConfig = createMockPersistentQueryConfig();
      const newConfig = { ...currentConfig, systemPromptKey: 'key2' };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns true when disallowedToolsKey changes', () => {
      const currentConfig = createMockPersistentQueryConfig();
      const newConfig = { ...currentConfig, disallowedToolsKey: 'tool1|tool2' };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns true when claudeCliPath changes', () => {
      const currentConfig = createMockPersistentQueryConfig();
      const newConfig = { ...currentConfig, claudeCliPath: '/new/claude' };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns true when settingSources changes', () => {
      const currentConfig = createMockPersistentQueryConfig();
      const newConfig = { ...currentConfig, settingSources: 'user,project,local' };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns true when pluginsKey changes', () => {
      const currentConfig = createMockPersistentQueryConfig();
      const newConfig = { ...currentConfig, pluginsKey: 'plugin-a:/path/a|plugin-b:/path/b' };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns true when model route environment changes', () => {
      const currentConfig = createMockPersistentQueryConfig({
        environmentKey: 'ANTHROPIC_BASE_URL=https://wowcode.cc/',
      });
      const newConfig = {
        ...currentConfig,
        environmentKey: 'ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic',
      };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns false when only effortLevel changes', () => {
      const currentConfig = createMockPersistentQueryConfig({ effortLevel: 'high' });
      const newConfig = { ...currentConfig, effortLevel: 'low' as const };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(false);
    });

    it('returns false when only model changes (dynamic update)', () => {
      const currentConfig = createMockPersistentQueryConfig();
      const newConfig = { ...currentConfig, model: 'claude-opus-4-5' };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(false);
    });

    it('returns true when adaptive thinking support changes', () => {
      const currentConfig = createMockPersistentQueryConfig({ model: 'sonnet', adaptiveThinking: true });
      const newConfig = {
        ...currentConfig,
        model: 'openai/gpt-5.4-mini',
        adaptiveThinking: false,
      };

      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns true when enableChrome changes from false to true', () => {
      const currentConfig = createMockPersistentQueryConfig();
      const newConfig = { ...currentConfig, enableChrome: true };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns true when enableChrome changes from true to false', () => {
      const currentConfig = createMockPersistentQueryConfig({ enableChrome: true });
      const newConfig = { ...currentConfig, enableChrome: false };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns true when enableAutoMode changes', () => {
      const currentConfig = createMockPersistentQueryConfig();
      const newConfig = { ...currentConfig, enableAutoMode: true };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns true when externalContextPaths changes', () => {
      const currentConfig = createMockPersistentQueryConfig();
      const newConfig = { ...currentConfig, externalContextPaths: ['/external/path'] };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns true when externalContextPaths is added', () => {
      const currentConfig = createMockPersistentQueryConfig({ externalContextPaths: ['/path/a'] });
      const newConfig = { ...currentConfig, externalContextPaths: ['/path/a', '/path/b'] };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns true when externalContextPaths is removed', () => {
      const currentConfig = createMockPersistentQueryConfig({ externalContextPaths: ['/path/a', '/path/b'] });
      const newConfig = { ...currentConfig, externalContextPaths: ['/path/a'] };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(true);
    });

    it('returns false when externalContextPaths order changes (same content)', () => {
      const currentConfig = createMockPersistentQueryConfig({ externalContextPaths: ['/path/a', '/path/b'] });
      // Same paths, different order - should NOT require restart since sorted comparison
      const newConfig = { ...currentConfig, externalContextPaths: ['/path/b', '/path/a'] };
      expect(QueryOptionsBuilder.needsRestart(currentConfig, newConfig)).toBe(false);
    });
  });

  describe('buildPersistentQueryConfig', () => {
    it('builds config with default settings', () => {
      const ctx = createMockContext();
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.model).toBe('claude-sonnet-4-5');
      expect(config.effortLevel).toBe('high');
      expect(config.permissionMode).toBe('yolo');
      expect(config.sdkPermissionMode).toBe('bypassPermissions');
      expect(config.settingSources).toBe('project,local');
      expect(config.claudeCliPath).toBe('/mock/claude');
    });

    it('tracks resolved sdkPermissionMode for normal mode', () => {
      const ctx = createMockContext({
        settings: createMockSettings({ permissionMode: 'normal', claudeSafeMode: 'default' }),
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.permissionMode).toBe('normal');
      expect(config.sdkPermissionMode).toBe('default');
    });

    it('tracks auto sdkPermissionMode for Claude safe mode', () => {
      const ctx = createMockContext({
        settings: createMockSettings({ permissionMode: 'normal', claudeSafeMode: 'auto' }),
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.permissionMode).toBe('normal');
      expect(config.sdkPermissionMode).toBe('auto');
      expect(config.enableAutoMode).toBe(true);
    });

    it('enables auto mode startup capability whenever Claude safe mode is auto', () => {
      const ctx = createMockContext({
        settings: createMockSettings({ permissionMode: 'yolo', claudeSafeMode: 'auto' }),
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.permissionMode).toBe('yolo');
      expect(config.sdkPermissionMode).toBe('bypassPermissions');
      expect(config.enableAutoMode).toBe(true);
    });

    it('ignores legacy thinking budget when building config', () => {
      const ctx = createMockContext({
        settings: createMockSettings({ model: 'custom-model', thinkingBudget: 'high', effortLevel: 'medium' }),
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.effortLevel).toBe('medium');
    });

    it('includes effortLevel for adaptive model', () => {
      const ctx = createMockContext({
        settings: createMockSettings({ model: 'sonnet', effortLevel: 'max' }),
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.effortLevel).toBe('max');
    });

    it('uses effort for Claude models even when a legacy budget is configured', () => {
      const ctx = createMockContext({
        settings: createMockSettings({ model: 'sonnet', thinkingBudget: 'high', effortLevel: 'max' }),
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.effortLevel).toBe('max');
    });

    it('normalizes unsupported xhigh effort for adaptive models', () => {
      const ctx = createMockContext({
        settings: createMockSettings({ model: 'sonnet', effortLevel: 'xhigh' }),
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.effortLevel).toBe('high');
    });

    it('sets effortLevel for custom model ids', () => {
      const ctx = createMockContext({
        settings: createMockSettings({ model: 'custom-model', effortLevel: 'high' }),
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.effortLevel).toBe('high');
    });

    it('tracks adaptive thinking support in the persistent config', () => {
      const ctx = createMockContext({
        settings: createMockSettings({ model: 'openrouter/fusion', effortLevel: 'high' }),
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.adaptiveThinking).toBe(false);
    });

    it('enables adaptive thinking in persistent config when Claude provider uses OpenRouter Claude', () => {
      const ctx = createMockContext({
        settings: createMockSettings({ model: 'anthropic/claude-opus-4.8', effortLevel: 'high' }),
        customEnv: { ANTHROPIC_BASE_URL: 'https://openrouter.ai/api' },
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.adaptiveThinking).toBe(true);
    });

    it('tracks DeepSeek routed environment in persistent config', () => {
      const ctx = createMockContext({
        settings: createMockSettings({
          model: 'deepseek-v4-pro[1m]',
          envSnippets: [
            {
              id: 'claude-deepseek-v4',
              name: 'DeepSeek V4 Pro',
              description: 'DeepSeek route',
              scope: 'provider:claude',
              envVars: 'ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic\nANTHROPIC_MODEL=deepseek-v4-pro[1m]\nANTHROPIC_DEFAULT_HAIKU_MODEL=deepseek-v4-flash\nCLAUDE_CODE_EFFORT_LEVEL=high',
            },
          ],
        }),
        customEnv: { ANTHROPIC_BASE_URL: 'https://wowcode.cc/' },
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.model).toBe('deepseek-v4-pro');
      expect(config.environmentKey).toContain('ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic');
      expect(config.environmentKey).toContain('ANTHROPIC_MODEL=deepseek-v4-pro');
      expect(config.environmentKey).not.toContain('[1m]');
      expect(config.environmentKey).toContain('ANTHROPIC_DEFAULT_HAIKU_MODEL=deepseek-v4-flash');
      expect(config.environmentKey).toContain('CLAUDE_CODE_EFFORT_LEVEL=high');
    });

    it('tracks OpenRouter routed environment in persistent config', () => {
      const ctx = createMockContext({
        settings: createMockSettings({
          model: 'openrouter/fusion',
          envSnippets: [
            {
              id: 'claude-openrouter-official',
              name: 'OpenRouter official route',
              description: 'OpenRouter route',
              scope: 'provider:claude',
              envVars: 'ANTHROPIC_BASE_URL=https://openrouter.ai/api\nANTHROPIC_AUTH_TOKEN=openrouter-token\nANTHROPIC_API_KEY=',
            },
          ],
        }),
        customEnv: { ANTHROPIC_BASE_URL: 'https://wowcode.cc/' },
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.environmentKey).toContain('ANTHROPIC_BASE_URL=https://openrouter.ai/api');
      expect(config.adaptiveThinking).toBe(false);
    });

    it('includes enableChrome from settings', () => {
      const ctx = createMockContext({
        settings: createMockSettings({ enableChrome: true }),
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.enableChrome).toBe(true);
    });

    it('sets settingSources to user,project,local when loadUserClaudeSettings is true', () => {
      const ctx = createMockContext({
        settings: createMockSettings({ loadUserClaudeSettings: true }),
      });
      const config = QueryOptionsBuilder.buildPersistentQueryConfig(ctx);

      expect(config.settingSources).toBe('user,project,local');
    });
  });

  describe('buildPersistentQueryOptions', () => {
    it('sets yolo mode options correctly', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.permissionMode).toBe('bypassPermissions');
      expect(options.allowDangerouslySkipPermissions).toBe(true);
    });

    it('includes canUseTool in yolo mode when provided', () => {
      const canUseTool = jest.fn();
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
        canUseTool,
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.permissionMode).toBe('bypassPermissions');
      expect(options.canUseTool).toBe(canUseTool);
    });

    it('sets normal mode options correctly (default claudeSafeMode)', () => {
      const canUseTool = jest.fn();
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ permissionMode: 'normal' }),
        }),
        abortController: new AbortController(),
        hooks: {},
        canUseTool,
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.permissionMode).toBe('acceptEdits');
      // Always true to enable dynamic switching to bypassPermissions without restart
      expect(options.allowDangerouslySkipPermissions).toBe(true);
      expect(options.canUseTool).toBe(canUseTool);
    });

    it('resolves claudeSafeMode "default" when permissionMode is normal', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ permissionMode: 'normal', claudeSafeMode: 'default' }),
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.permissionMode).toBe('default');
      expect(options.allowDangerouslySkipPermissions).toBe(true);
    });

    it('resolves claudeSafeMode "auto" when permissionMode is normal', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ permissionMode: 'normal', claudeSafeMode: 'auto' }),
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.permissionMode).toBe('auto');
      expect(options.allowDangerouslySkipPermissions).toBe(true);
      expect(options.extraArgs).toEqual({ 'enable-auto-mode': null });
    });

    it('passes auto mode opt-in whenever Claude safe mode is auto', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ permissionMode: 'yolo', claudeSafeMode: 'auto' }),
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.permissionMode).toBe('bypassPermissions');
      expect(options.extraArgs).toEqual({ 'enable-auto-mode': null });
    });

    it('ignores claudeSafeMode when permissionMode is yolo', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ permissionMode: 'yolo', claudeSafeMode: 'default' }),
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.permissionMode).toBe('bypassPermissions');
    });

    it('sets plan mode options correctly', () => {
      const canUseTool = jest.fn();
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ permissionMode: 'plan' as any }),
        }),
        abortController: new AbortController(),
        hooks: {},
        canUseTool,
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.permissionMode).toBe('plan');
      expect(options.allowDangerouslySkipPermissions).toBe(true);
      expect(options.canUseTool).toBe(canUseTool);
    });

    it('sets adaptive thinking with effort for Claude models', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ model: 'sonnet', effortLevel: 'max' }),
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.thinking).toEqual({ type: 'adaptive' });
      expect(options.effort).toBe('max');
      expect(options.maxThinkingTokens).toBeUndefined();
    });

    it('clamps unsupported xhigh effort before building adaptive options', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ model: 'sonnet', effortLevel: 'xhigh' }),
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.thinking).toEqual({ type: 'adaptive' });
      expect(options.effort).toBe('high');
    });

    it('sets adaptive thinking with effort for custom models', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ model: 'custom-model', thinkingBudget: 'high', effortLevel: 'medium' }),
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.thinking).toEqual({ type: 'adaptive' });
      expect(options.effort).toBe('medium');
      expect(options.maxThinkingTokens).toBeUndefined();
    });

    it('routes DeepSeek models to the DeepSeek snippet environment', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({
            model: 'deepseek-v4-pro[1m]',
            effortLevel: 'high',
            envSnippets: [
              {
                id: 'claude-deepseek-v4',
                name: 'DeepSeek V4 Pro',
                description: 'DeepSeek route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic\nANTHROPIC_AUTH_TOKEN=deepseek-token\nANTHROPIC_MODEL=deepseek-v4-pro[1m]\nANTHROPIC_DEFAULT_OPUS_MODEL=deepseek-v4-pro[1m]\nANTHROPIC_DEFAULT_HAIKU_MODEL=deepseek-v4-flash\nCLAUDE_CODE_EFFORT_LEVEL=high',
              },
            ],
          }),
          customEnv: {
            ANTHROPIC_BASE_URL: 'https://wowcode.cc/',
            ANTHROPIC_AUTH_TOKEN: 'wowcode-token',
          },
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.model).toBe('deepseek-v4-pro');
      expect(options.env?.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic');
      expect(options.env?.ANTHROPIC_AUTH_TOKEN).toBe('deepseek-token');
      expect(options.env?.ANTHROPIC_MODEL).toBe('deepseek-v4-pro');
      expect(options.env?.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('deepseek-v4-pro');
      expect(options.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('deepseek-v4-flash');
      expect(options.effort).toBe('high');
    });

    it('routes the DeepSeek vision experiment through the official DeepSeek endpoint', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({
            model: 'deepseek-v4-flash-vision-exp',
            effortLevel: 'max',
            envSnippets: [
              {
                id: 'claude-deepseek-v4',
                name: 'DeepSeek V4 Pro',
                description: 'DeepSeek route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic\nANTHROPIC_AUTH_TOKEN=deepseek-token\nANTHROPIC_MODEL=deepseek-v4-pro\nCLAUDE_CODE_EFFORT_LEVEL=high',
              },
            ],
          }),
          customEnv: {
            ANTHROPIC_BASE_URL: 'https://wowcode.cc/',
            ANTHROPIC_AUTH_TOKEN: 'wowcode-token',
          },
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.model).toBe('deepseek-v4-flash-vision-exp');
      expect(options.env?.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic');
      expect(options.env?.ANTHROPIC_AUTH_TOKEN).toBe('deepseek-token');
      expect(options.env?.ANTHROPIC_MODEL).toBe('deepseek-v4-flash-vision-exp');
      expect(options.thinking).toEqual({ type: 'adaptive' });
      expect(options.effort).toBe('max');
    });

    it('routes non-DeepSeek Claude models back to the WoWCode snippet environment', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({
            model: 'claude-opus-4-8',
            effortLevel: 'high',
            envSnippets: [
              {
                id: 'claude-wowcode-before-deepseek-v4',
                name: 'WoWCode Claude route',
                description: 'WoWCode route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://wowcode.cc/\nANTHROPIC_AUTH_TOKEN=wowcode-token',
              },
              {
                id: 'claude-deepseek-v4',
                name: 'DeepSeek V4 Pro',
                description: 'DeepSeek route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic\nANTHROPIC_AUTH_TOKEN=deepseek-token\nANTHROPIC_MODEL=deepseek-v4-pro[1m]',
              },
            ],
          }),
          customEnv: {
            ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
            ANTHROPIC_AUTH_TOKEN: 'deepseek-token',
          },
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.env?.ANTHROPIC_BASE_URL).toBe('https://wowcode.cc/');
      expect(options.env?.ANTHROPIC_AUTH_TOKEN).toBe('wowcode-token');
      expect(options.env?.ANTHROPIC_MODEL).toBeUndefined();
    });

    it('routes OpenRouter group models to the OpenRouter snippet environment', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({
            model: '~anthropic/claude-sonnet-latest',
            effortLevel: 'high',
            envSnippets: [
              {
                id: 'claude-wowcode-before-deepseek-v4',
                name: 'WoWCode Claude route',
                description: 'WoWCode route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://wowcode.cc/\nANTHROPIC_AUTH_TOKEN=wowcode-token',
              },
              {
                id: 'claude-openrouter-official',
                name: 'OpenRouter official route',
                description: 'OpenRouter route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://openrouter.ai/api\nANTHROPIC_AUTH_TOKEN=openrouter-token\nANTHROPIC_API_KEY=',
              },
              {
                id: 'claude-deepseek-v4',
                name: 'DeepSeek V4 Pro',
                description: 'DeepSeek route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic\nANTHROPIC_AUTH_TOKEN=deepseek-token\nANTHROPIC_MODEL=deepseek-v4-pro[1m]',
              },
            ],
          }),
          customEnv: {
            ANTHROPIC_BASE_URL: 'https://wowcode.cc/',
            ANTHROPIC_AUTH_TOKEN: 'wowcode-token',
          },
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.model).toBe('~anthropic/claude-sonnet-latest');
      expect(options.env?.ANTHROPIC_BASE_URL).toBe('https://openrouter.ai/api');
      expect(options.env?.ANTHROPIC_AUTH_TOKEN).toBe('openrouter-token');
      expect(options.env?.ANTHROPIC_MODEL).toBeUndefined();
      expect(options.thinking).toEqual({ type: 'adaptive' });
      expect(options.effort).toBe('high');
    });

    it('routes direct Kimi models to the Kimi snippet environment with adaptive thinking', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({
            model: 'kimi-k2.7-code',
            effortLevel: 'max',
            envSnippets: [
              {
                id: 'claude-wowcode-before-deepseek-v4',
                name: 'WoWCode Claude route',
                description: 'WoWCode route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://wowcode.cc/\nANTHROPIC_AUTH_TOKEN=wowcode-token',
              },
              {
                id: 'claude-kimi-official',
                name: 'Kimi official route',
                description: 'Kimi route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://api.moonshot.cn/anthropic\nANTHROPIC_AUTH_TOKEN=kimi-token\nENABLE_TOOL_SEARCH=false',
              },
              {
                id: 'claude-openrouter-official',
                name: 'OpenRouter official route',
                description: 'OpenRouter route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://openrouter.ai/api\nANTHROPIC_AUTH_TOKEN=openrouter-token',
              },
            ],
          }),
          customEnv: {
            ANTHROPIC_BASE_URL: 'https://wowcode.cc/',
            ANTHROPIC_AUTH_TOKEN: 'wowcode-token',
          },
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.model).toBe('kimi-k2.7-code');
      expect(options.env?.ANTHROPIC_BASE_URL).toBe('https://api.moonshot.cn/anthropic');
      expect(options.env?.ANTHROPIC_AUTH_TOKEN).toBe('kimi-token');
      expect(options.env?.ENABLE_TOOL_SEARCH).toBe('false');
      expect(options.env?.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('kimi-k2.7-code');
      expect(options.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('kimi-k2.7-code');
      expect(options.env?.CLAUDE_CODE_SUBAGENT_MODEL).toBe('kimi-k2.7-code');
      expect(options.env?.CLAUDE_CODE_AUTO_COMPACT_WINDOW).toBe('262144');
      expect(options.thinking).toEqual({ type: 'adaptive' });
      expect(options.effort).toBe('max');
    });

    it('routes OpenRouter Fable 5 to the OpenRouter snippet environment', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({
            model: 'anthropic/claude-fable-5',
            effortLevel: 'high',
            envSnippets: [
              {
                id: 'claude-wowcode-before-deepseek-v4',
                name: 'WoWCode Claude route',
                description: 'WoWCode route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://wowcode.cc/\nANTHROPIC_AUTH_TOKEN=wowcode-token',
              },
              {
                id: 'claude-openrouter-official',
                name: 'OpenRouter official route',
                description: 'OpenRouter route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://openrouter.ai/api\nANTHROPIC_AUTH_TOKEN=openrouter-token\nANTHROPIC_API_KEY=',
              },
            ],
          }),
          customEnv: {
            ANTHROPIC_BASE_URL: 'https://wowcode.cc/',
            ANTHROPIC_AUTH_TOKEN: 'wowcode-token',
          },
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.model).toBe('anthropic/claude-fable-5');
      expect(options.env?.ANTHROPIC_BASE_URL).toBe('https://openrouter.ai/api');
      expect(options.env?.ANTHROPIC_AUTH_TOKEN).toBe('openrouter-token');
      expect(options.env?.ANTHROPIC_MODEL).toBeUndefined();
      expect(options.thinking).toEqual({ type: 'adaptive' });
      expect(options.effort).toBe('high');
    });

    it.each([
      'anthropic/claude-opus-4.8',
      'anthropic/claude-sonnet-5',
      'anthropic/claude-haiku-4.5',
    ])('routes OpenRouter Anthropic model %s to the OpenRouter snippet environment', (model) => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({
            model,
            effortLevel: 'high',
            envSnippets: [
              {
                id: 'claude-wowcode-before-deepseek-v4',
                name: 'WoWCode Claude route',
                description: 'WoWCode route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://wowcode.cc/\nANTHROPIC_AUTH_TOKEN=wowcode-token',
              },
              {
                id: 'claude-openrouter-official',
                name: 'OpenRouter official route',
                description: 'OpenRouter route',
                scope: 'provider:claude',
                envVars: 'ANTHROPIC_BASE_URL=https://openrouter.ai/api\nANTHROPIC_AUTH_TOKEN=openrouter-token\nANTHROPIC_API_KEY=',
              },
            ],
          }),
          customEnv: {
            ANTHROPIC_BASE_URL: 'https://wowcode.cc/',
            ANTHROPIC_AUTH_TOKEN: 'wowcode-token',
          },
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.model).toBe(model);
      expect(options.env?.ANTHROPIC_BASE_URL).toBe('https://openrouter.ai/api');
      expect(options.env?.ANTHROPIC_AUTH_TOKEN).toBe('openrouter-token');
      expect(options.env?.ANTHROPIC_MODEL).toBeUndefined();
      expect(options.thinking).toEqual({ type: 'adaptive' });
      expect(options.effort).toBe('high');
    });

    it('sets adaptive thinking for Anthropic slugs routed through OpenRouter', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ model: 'anthropic/claude-opus-4.8', effortLevel: 'max' }),
          customEnv: { ANTHROPIC_BASE_URL: 'https://openrouter.ai/api' },
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.thinking).toEqual({ type: 'adaptive' });
      expect(options.effort).toBe('max');
      expect(options.maxThinkingTokens).toBeUndefined();
    });

    it('does not set adaptive thinking for explicitly non-Claude OpenRouter slugs', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ model: 'openai/gpt-5.4-mini', effortLevel: 'medium' }),
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.thinking).toBeUndefined();
      expect(options.effort).toBeUndefined();
      expect(options.maxThinkingTokens).toBeUndefined();
    });

    it('sets resume session ID when provided', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
        resume: { sessionId: 'session-123' },
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.resume).toBe('session-123');
    });

    it('sets extraArgs with chrome flag when enableChrome is enabled', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ enableChrome: true }),
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.extraArgs).toBeDefined();
      expect(options.extraArgs).toEqual({ chrome: null });
    });

    it('sets extraArgs with chrome and auto mode flags when both are enabled', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ enableChrome: true, claudeSafeMode: 'auto' }),
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.extraArgs).toEqual({ 'enable-auto-mode': null, chrome: null });
    });

    it('does not set extraArgs when enableChrome is disabled', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ enableChrome: false }),
        }),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.extraArgs).toBeUndefined();
    });

    it('sets additionalDirectories when externalContextPaths provided', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
        externalContextPaths: ['/external/path1', '/external/path2'],
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.additionalDirectories).toEqual(['/external/path1', '/external/path2']);
    });

    it('does not set additionalDirectories when externalContextPaths is empty', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
        externalContextPaths: [],
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.additionalDirectories).toBeUndefined();
    });

    it('always enables file checkpointing', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.enableFileCheckpointing).toBe(true);
    });

    it('sets resumeSessionAt when provided in resume', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
        resume: { sessionId: 'session-123', sessionAt: 'asst-uuid-456' },
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.resumeSessionAt).toBe('asst-uuid-456');
    });

    it('does not set resumeSessionAt when resume has no sessionAt', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
        resume: { sessionId: 'session-123' },
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.resumeSessionAt).toBeUndefined();
    });

    it('sets forkSession when resume.fork is true', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
        resume: { sessionId: 'session-123', fork: true },
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.forkSession).toBe(true);
    });

    it('does not set forkSession when resume has no fork', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
        resume: { sessionId: 'session-123' },
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.forkSession).toBeUndefined();
    });

    it('sets both forkSession and resumeSessionAt when fork resumes at specific point', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
        resume: { sessionId: 'session-123', sessionAt: 'asst-uuid-456', fork: true },
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.resume).toBe('session-123');
      expect(options.resumeSessionAt).toBe('asst-uuid-456');
      expect(options.forkSession).toBe(true);
    });

    it('does not set resume options when no resume provided', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
      };
      const options = QueryOptionsBuilder.buildPersistentQueryOptions(ctx);

      expect(options.resume).toBeUndefined();
      expect(options.resumeSessionAt).toBeUndefined();
      expect(options.forkSession).toBeUndefined();
    });

    it('does not pass plugins or agents via SDK options (SDK auto-discovers from settings)', () => {
      const ctx = createMockContext();
      const options = QueryOptionsBuilder.buildPersistentQueryOptions({
        ...ctx, abortController: new AbortController(), hooks: {},
      });

      expect(options.plugins).toBeUndefined();
      expect(options.agents).toBeUndefined();
    });
  });

  describe('buildColdStartQueryOptions', () => {
    it('includes MCP servers when available', () => {
      const mcpManager = createMockMcpManager();
      mcpManager.getActiveServers.mockReturnValue({
        'test-server': { command: 'test', args: [] },
      });

      const ctx = {
        ...createMockContext({ mcpManager }),
        abortController: new AbortController(),
        hooks: {},
        mcpMentions: new Set(['test-server']),
        hasEditorContext: false,
      };
      const options = QueryOptionsBuilder.buildColdStartQueryOptions(ctx);

      expect(options.mcpServers).toBeDefined();
      expect(options.mcpServers?.['test-server']).toBeDefined();
    });

    it('uses model override when provided', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ model: 'claude-sonnet-4-5' }),
        }),
        abortController: new AbortController(),
        hooks: {},
        modelOverride: 'claude-opus-4-5',
        hasEditorContext: false,
      };
      const options = QueryOptionsBuilder.buildColdStartQueryOptions(ctx);

      expect(options.model).toBe('claude-opus-4-5');
    });

    it('applies tool restriction when allowedTools is provided', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
        allowedTools: ['Read', 'Grep'],
        hasEditorContext: false,
      };
      const options = QueryOptionsBuilder.buildColdStartQueryOptions(ctx);

      expect(options.tools).toEqual(['Read', 'Grep']);
    });

    it('sets extraArgs with chrome flag when enableChrome is enabled', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ enableChrome: true }),
        }),
        abortController: new AbortController(),
        hooks: {},
        hasEditorContext: false,
      };
      const options = QueryOptionsBuilder.buildColdStartQueryOptions(ctx);

      expect(options.extraArgs).toBeDefined();
      expect(options.extraArgs).toEqual({ chrome: null });
    });

    it('sets extraArgs with auto mode flag when Claude safe mode is auto', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ claudeSafeMode: 'auto' }),
        }),
        abortController: new AbortController(),
        hooks: {},
        hasEditorContext: false,
      };
      const options = QueryOptionsBuilder.buildColdStartQueryOptions(ctx);

      expect(options.extraArgs).toEqual({ 'enable-auto-mode': null });
    });

    it('does not set extraArgs when enableChrome is disabled', () => {
      const ctx = {
        ...createMockContext({
          settings: createMockSettings({ enableChrome: false }),
        }),
        abortController: new AbortController(),
        hooks: {},
        hasEditorContext: false,
      };
      const options = QueryOptionsBuilder.buildColdStartQueryOptions(ctx);

      expect(options.extraArgs).toBeUndefined();
    });

    it('sets additionalDirectories when externalContextPaths provided', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
        hasEditorContext: false,
        externalContextPaths: ['/external/path'],
      };
      const options = QueryOptionsBuilder.buildColdStartQueryOptions(ctx);

      expect(options.additionalDirectories).toEqual(['/external/path']);
    });

    it('does not set additionalDirectories when externalContextPaths is empty', () => {
      const ctx = {
        ...createMockContext(),
        abortController: new AbortController(),
        hooks: {},
        hasEditorContext: false,
        externalContextPaths: [],
      };
      const options = QueryOptionsBuilder.buildColdStartQueryOptions(ctx);

      expect(options.additionalDirectories).toBeUndefined();
    });

    it('does not pass plugins via SDK options (CLI auto-discovers)', () => {
      const ctx = createMockContext();
      const options = QueryOptionsBuilder.buildColdStartQueryOptions({
        ...ctx, abortController: new AbortController(), hooks: {}, hasEditorContext: false,
      });

      expect(options.plugins).toBeUndefined();
    });

    it('does not pass agents via SDK options (SDK auto-discovers from settings)', () => {
      const ctx = createMockContext();
      const options = QueryOptionsBuilder.buildColdStartQueryOptions({
        ...ctx, abortController: new AbortController(), hooks: {}, hasEditorContext: false,
      });

      expect(options.agents).toBeUndefined();
    });
  });
});
