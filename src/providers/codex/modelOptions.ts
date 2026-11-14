import { getRuntimeEnvironmentVariables } from '../../core/providers/providerEnvironment';
import type { ProviderUIOption } from '../../core/providers/types';
import { CODEX_UPSTREAM_DEFAULT_MODEL_ID } from './CodexNativeCatalogContract';
import {
  type CodexDiscoveredModel,
  getCodexPublicFallbackCatalog,
  isCodexModelAvailable,
} from './models';
import {
  encodeCodexModelSelectionId,
  toCodexRuntimeModelId,
} from './modelSelection';
import { getCodexProviderSettings, getVisibleCodexModelIds } from './settings';
import { formatCodexModelLabel } from './types/models';

function createCustomCodexModelOption(modelId: string, description: string): ProviderUIOption {
  const runtimeModelId = toCodexRuntimeModelId(modelId);
  return {
    value: encodeCodexModelSelectionId(runtimeModelId),
    label: formatCodexModelLabel(runtimeModelId),
    description,
  };
}

function getConfiguredEnvModel(settings: Record<string, unknown>): string | null {
  const modelId = getRuntimeEnvironmentVariables(settings, 'codex').OPENAI_MODEL?.trim();
  return modelId ? modelId : null;
}

export function getConfiguredEnvCustomModel(settings: Record<string, unknown>): string | null {
  const modelId = getConfiguredEnvModel(settings);
  const discoveredModels = getCodexProviderSettings(settings).discoveredModels;
  const runtimeModelId = modelId ? toCodexRuntimeModelId(modelId) : null;
  return modelId
    && runtimeModelId
    && !discoveredModels.some(model => model.model === runtimeModelId)
    ? modelId
    : null;
}

export function parseConfiguredCustomModelIds(value: string): string[] {
  const modelIds: string[] = [];
  const seen = new Set<string>();

  for (const line of value.split(/\r?\n/)) {
    const modelId = line.trim();
    if (!modelId || seen.has(modelId)) {
      continue;
    }

    seen.add(modelId);
    modelIds.push(modelId);
  }

  return modelIds;
}

export function getCodexPickerModels(settings: Record<string, unknown>): CodexDiscoveredModel[] {
  const codexSettings = getCodexProviderSettings(settings);
  if (codexSettings.visibleModels !== null) {
    return codexSettings.discoveredModels;
  }

  const hasAvailableModel = codexSettings.discoveredModels.some(model =>
    isCodexModelAvailable(model, codexSettings.enableUltraEffort)
  );
  return hasAvailableModel
    ? codexSettings.discoveredModels
    : getCodexPublicFallbackCatalog();
}

function getAvailablePickerModelIds(
  settings: Record<string, unknown>,
  pickerModels: CodexDiscoveredModel[],
): string[] {
  const codexSettings = getCodexProviderSettings(settings);
  return getVisibleCodexModelIds(codexSettings.visibleModels, pickerModels).filter(modelId => {
    const model = pickerModels.find(candidate => candidate.model === modelId);
    return Boolean(model && isCodexModelAvailable(model, codexSettings.enableUltraEffort));
  });
}

export function resolveCodexDefaultModelId(settings: Record<string, unknown>): string | null {
  const availableModelIds = getAvailablePickerModelIds(settings, getCodexPickerModels(settings));
  if (availableModelIds.includes(CODEX_UPSTREAM_DEFAULT_MODEL_ID)) {
    return CODEX_UPSTREAM_DEFAULT_MODEL_ID;
  }
  if (availableModelIds[0]) {
    return availableModelIds[0];
  }
  return getCodexModelOptions(settings)[0]?.value ?? null;
}

export function getCodexModelOptions(settings: Record<string, unknown>): ProviderUIOption[] {
  const codexSettings = getCodexProviderSettings(settings);
  const pickerModels = getCodexPickerModels(settings);
  const getModelLabel = (modelId: string, fallback: string): string => {
    return codexSettings.modelAliases[modelId] ?? fallback;
  };
  const visibleModelIds = getVisibleCodexModelIds(
    codexSettings.visibleModels,
    pickerModels,
  );
  const visibleModelIdSet = new Set(visibleModelIds);
  const discoveredModelsById = new Map(pickerModels.map(model => [
    model.model,
    model,
  ] as const));
  const discoveredModelIds = new Set(pickerModels.map(model => model.model));
  const visibleDiscoveredModels = [...visibleModelIds]
    .reverse()
    .map(modelId => discoveredModelsById.get(modelId))
    .filter((model): model is NonNullable<typeof model> => Boolean(
      model
      && visibleModelIdSet.has(model.model)
      && isCodexModelAvailable(model, codexSettings.enableUltraEffort),
    ));
  const models: ProviderUIOption[] = visibleDiscoveredModels.map(model => ({
    value: model.model,
    label: getModelLabel(model.model, model.displayName),
    description: model.description || undefined,
  }));
  const seenModelIds = new Set(discoveredModelIds);

  const persistedVisibleModels = codexSettings.visibleModels === null
    ? []
    : [...codexSettings.visibleModels].reverse();
  for (const modelId of persistedVisibleModels) {
    if (seenModelIds.has(modelId)) {
      continue;
    }

    seenModelIds.add(modelId);
    models.push({
      value: modelId,
      label: getModelLabel(modelId, formatCodexModelLabel(modelId)),
      description: 'Selected model',
    });
  }

  const allowsModel = (modelId: string): boolean => {
    if (codexSettings.visibleModels === null) {
      return true;
    }
    const runtimeModelId = toCodexRuntimeModelId(modelId);
    return codexSettings.visibleModels.some(entry =>
      entry === modelId || toCodexRuntimeModelId(entry) === runtimeModelId
    );
  };

  const envModel = getConfiguredEnvCustomModel(settings);
  if (envModel && allowsModel(envModel)) {
    const runtimeModelId = toCodexRuntimeModelId(envModel);
    const existingIndex = models.findIndex(option =>
      toCodexRuntimeModelId(option.value) === runtimeModelId
    );
    if (existingIndex >= 0) {
      models.splice(existingIndex, 1);
    }
    seenModelIds.add(runtimeModelId);
    models.unshift(createCustomCodexModelOption(envModel, 'Custom (env)'));
  }

  for (const configuredModelId of parseConfiguredCustomModelIds(codexSettings.customModels)) {
    const modelId = toCodexRuntimeModelId(configuredModelId);
    if (seenModelIds.has(modelId) || !allowsModel(modelId)) {
      continue;
    }

    seenModelIds.add(modelId);
    models.push(createCustomCodexModelOption(modelId, 'Custom model'));
  }

  return models;
}

export function resolveCodexModelSelection(
  settings: Record<string, unknown>,
  currentModel: string,
): string | null {
  const codexSettings = getCodexProviderSettings(settings);
  const modelOptions = getCodexModelOptions(settings);
  const envModel = getConfiguredEnvModel(settings);
  if (envModel) {
    const envRuntimeModel = toCodexRuntimeModelId(envModel);
    const envOption = modelOptions.find(option =>
      option.value === envModel
      || toCodexRuntimeModelId(option.value) === envRuntimeModel
    );
    if (envOption) {
      return envOption.value;
    }
    const envDiscoveredModel = codexSettings.discoveredModels.find(model =>
      toCodexRuntimeModelId(model.model) === envRuntimeModel
    );
    if (!envDiscoveredModel) {
      return envModel;
    }
  }

  if (currentModel) {
    const currentRuntimeModel = toCodexRuntimeModelId(currentModel);
    const currentOption = modelOptions.find(option =>
      option.value === currentModel
      || toCodexRuntimeModelId(option.value) === currentRuntimeModel
    );
    if (currentOption) {
      return currentOption.value;
    }
  }

  return resolveCodexDefaultModelId(settings);
}
