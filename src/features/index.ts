export const ENVIRONMENTS = ["local", "integration", "production"] as const;

export type EnvironmentName = (typeof ENVIRONMENTS)[number];

export type FeatureName = "generations" | "auth" | "flashcards";

export type FeatureConfig = Record<EnvironmentName, Record<FeatureName, boolean>>;

const DEFAULT_ENV: EnvironmentName = "production";

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
  production: {
    auth: true,
    flashcards: true,
    generations: true,
  },
};

const resolveEnvName = (): EnvironmentName => {
  const value = (import.meta.env?.ENV_NAME as string | undefined) ?? DEFAULT_ENV;

  if (value === "local" || value === "integration" || value === "production") {
    return value;
  }

  return DEFAULT_ENV;
};

export const currentEnv: EnvironmentName = resolveEnvName();

export const isFeatureEnabled = (feature: FeatureName, env: EnvironmentName = currentEnv): boolean => {
  return featureFlags[env][feature];
};
