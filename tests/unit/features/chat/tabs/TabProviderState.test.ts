import { ProviderRegistry } from '@/core/providers/ProviderRegistry';
import { getBlankTabModelOptions } from '@/features/chat/tabs/TabProviderState';

jest.mock('@/core/providers/ProviderRegistry', () => ({
  ProviderRegistry: {
    getChatUIConfig: jest.fn(),
    getEnabledProviderIds: jest.fn(),
    getProviderDisplayName: jest.fn(),
  },
}));

const CLAUDE_ICON = {
  viewBox: '0 0 16 16',
  path: 'M1 1h14v14H1z',
};
const CODEX_ICON = {
  viewBox: '0 0 24 24',
  path: 'M2 2h20v20H2z',
};
const GATEWAY_ICON = {
  viewBox: '0 0 20 20',
  path: 'M3 3h14v14H3z',
};

describe('getBlankTabModelOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ProviderRegistry.getProviderDisplayName as jest.Mock)
      .mockImplementation((providerId: string) => (
        providerId === 'codex' ? 'Codex' : 'Claude'
      ));
  });

  it('prefers an exact native Codex GPT match without removing distinct Claude gateways', () => {
    (ProviderRegistry.getEnabledProviderIds as jest.Mock).mockReturnValue(['claude', 'codex']);
    (ProviderRegistry.getChatUIConfig as jest.Mock).mockImplementation((providerId: string) => (
      providerId === 'codex'
        ? {
          getModelOptions: () => [
            { value: 'gpt-5.6-terra', label: 'GPT-5.6 Terra' },
            { value: 'gpt-5.6-sol', label: 'GPT-5.6 Sol' },
          ],
          getProviderIcon: () => CODEX_ICON,
        }
        : {
          getModelOptions: () => [
            {
              value: 'claude-code/openai/gpt-5.6-terra',
              label: 'GPT-5.6 Terra via gateway',
              group: 'GPT',
              providerIcon: GATEWAY_ICON,
            },
            {
              value: 'claude-code/openai/gpt-router-only',
              label: 'Gateway-only GPT',
              group: 'GPT',
              providerIcon: GATEWAY_ICON,
            },
          ],
          getProviderIcon: () => CLAUDE_ICON,
        }
    ));

    const options = getBlankTabModelOptions({});

    expect(options.map(option => option.value)).toEqual([
      'claude-code/openai/gpt-router-only',
      'gpt-5.6-terra',
      'gpt-5.6-sol',
    ]);
    expect(options[0]).toMatchObject({
      group: 'GPT',
      providerIcon: GATEWAY_ICON,
      providerId: 'claude',
    });
    expect(options[1]).toMatchObject({
      group: 'Codex',
      providerIcon: CODEX_ICON,
      providerId: 'codex',
    });
  });

  it('deduplicates unqualified gateway GPT ids without collapsing a distinct 1M route', () => {
    (ProviderRegistry.getEnabledProviderIds as jest.Mock).mockReturnValue(['claude', 'codex']);
    (ProviderRegistry.getChatUIConfig as jest.Mock).mockImplementation((providerId: string) => (
      providerId === 'codex'
        ? {
          getModelOptions: () => [{ value: 'gpt-5.6-terra', label: 'Native Terra' }],
          getProviderIcon: () => CODEX_ICON,
        }
        : {
          getModelOptions: () => [
            { value: 'claude-code/gpt-5.6-terra', label: 'Gateway Terra' },
            { value: 'claude-code/gpt-5.6-terra[1m]', label: 'Gateway Terra 1M' },
          ],
          getProviderIcon: () => CLAUDE_ICON,
        }
    ));

    expect(getBlankTabModelOptions({}).map(option => option.value)).toEqual([
      'claude-code/gpt-5.6-terra[1m]',
      'gpt-5.6-terra',
    ]);
  });

  it('deduplicates a native GPT-6.1 Terra entry against the Claude gateway id', () => {
    (ProviderRegistry.getEnabledProviderIds as jest.Mock).mockReturnValue(['claude', 'codex']);
    (ProviderRegistry.getChatUIConfig as jest.Mock).mockImplementation((providerId: string) => (
      providerId === 'codex'
        ? {
          getModelOptions: () => [
            { value: 'gpt-6.1-terra', label: 'GPT-6.1 Terra' },
            { value: 'gpt-6-astra', label: 'GPT-6 Astra' },
          ],
          getProviderIcon: () => CODEX_ICON,
        }
        : {
          getModelOptions: () => [
            { value: 'claude-code/openai/gpt-6.1-terra', label: 'Gateway Terra' },
            { value: 'claude-code/openai/gpt-6-cyber', label: 'Gateway Cyber' },
          ],
          getProviderIcon: () => CLAUDE_ICON,
        }
    ));

    expect(getBlankTabModelOptions({}).map(option => option.value)).toEqual([
      'claude-code/openai/gpt-6-cyber',
      'gpt-6.1-terra',
      'gpt-6-astra',
    ]);
  });

  it('keeps the Claude gateway GPT visible when native Codex is not enabled', () => {
    (ProviderRegistry.getEnabledProviderIds as jest.Mock).mockReturnValue(['claude']);
    (ProviderRegistry.getChatUIConfig as jest.Mock).mockReturnValue({
      getModelOptions: () => [{
        value: 'claude-code/openai/gpt-5.6-terra',
        label: 'GPT-5.6 Terra via gateway',
        group: 'GPT',
        providerIcon: GATEWAY_ICON,
      }],
      getProviderIcon: () => CLAUDE_ICON,
    });

    expect(getBlankTabModelOptions({})).toEqual([{
      value: 'claude-code/openai/gpt-5.6-terra',
      label: 'GPT-5.6 Terra via gateway',
      group: 'GPT',
      providerIcon: GATEWAY_ICON,
      providerId: 'claude',
    }]);
  });
});
