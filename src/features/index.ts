export const ENVIRONMENTS = ["local", "integration", "prod"] as const;

export type EnvironmentName = (typeof ENVIRONMENTS)[number];

export type FeatureName = "generations" | "auth" | "flashcards";

export type FeatureConfig = Record<EnvironmentName, Record<FeatureName, boolean>>;

const DEFAULT_ENV: EnvironmentName = "prod";

const featureFlags: FeatureConfig = {
  local: {
    auth: true,
    flashcards: true,
    generations: true,
  },
  integration: {
    auth: true,
    flashcards: true,
    generations: true,
  },
  prod: {
    auth: true,
    flashcards: true,
    generations: true,
  },
};

const resolveEnvName = (): EnvironmentName => {
  const value = (import.meta.env?.ENV_NAME as string | undefined) ?? DEFAULT_ENV;

  if (value === "local" || value === "integration" || value === "prod") {
    return value;
  }

  return DEFAULT_ENV;
};

export const currentEnv: EnvironmentName = resolveEnvName();

export const isFeatureEnabled = (feature: FeatureName, env: EnvironmentName = currentEnv): boolean => {
  return featureFlags[env][feature];
};
