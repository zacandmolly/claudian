const mockGetHostnameKey = jest.fn(() => 'device:current');

jest.mock('@/utils/env', () => ({
  ...jest.requireActual('@/utils/env'),
  getHostnameKey: () => mockGetHostnameKey(),
}));

import {
  getClaudeProviderSettings,
  updateClaudeProviderSettings,
} from '@/providers/claude/settings';

describe('Claude settings normalization', () => {
  it('normalizes mixed CLI maps without interpreting host-shaped keys', () => {
    expect(getClaudeProviderSettings({
      providerConfigs: {
        claude: {
          cliPathsByHost: {
            ' legacy-host ': ' /legacy/claude ',
            invalid: 42,
            empty: '',
          },
        },
      },
    }).cliPathsByHost).toEqual({
      'legacy-host': '/legacy/claude',
    });
  });

  it('rejects arrays as CLI maps', () => {
    expect(getClaudeProviderSettings({
      providerConfigs: { claude: { cliPathsByHost: ['/array/claude'] } },
    }).cliPathsByHost).toEqual({});
  });

  it('reads the legacy custom-only model preference and preserves unknown config fields', () => {
    const settings: Record<string, unknown> = {
      providerConfigs: {
        claude: {
          showDefaultModels: false,
          routingPolicy: { pool: 'stable' },
        },
      },
    };

    expect(getClaudeProviderSettings(settings).showDefaultModels).toBe(false);

    updateClaudeProviderSettings(settings, { lastModel: 'deepseek-v4-flash' });

    expect(settings.providerConfigs).toEqual(expect.objectContaining({
      claude: expect.objectContaining({
        showDefaultModels: false,
        routingPolicy: { pool: 'stable' },
        lastModel: 'deepseek-v4-flash',
      }),
    }));
  });
});
