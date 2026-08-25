import { supportsClaudeAdaptiveThinking } from '../types/models';

export function shouldUseClaudeAdaptiveThinking(
  model: string,
  env: Record<string, string | undefined>,
): boolean {
  if (!supportsClaudeAdaptiveThinking(model)) {
    return false;
  }

  return true;
}
