/**
 * src/services/ai/index.ts
 *
 * Public API for AIService
 */

export { AIService } from "./ai.service";
export type { AIServiceConfig, AIModelParams, RetryPolicy, GenerateObjectOptions, Logger } from "./ai.service";
export { AIServiceConfigSchema, AIModelParamsSchema, RetryPolicySchema } from "./ai.service";

export { aiErrors } from "./ai.errors";

export {
  createAIService,
  createDevConfig,
  createProdConfig,
  createTestConfig,
  createHighPerfConfig,
  createCreativeConfig,
  createReliableConfig,
  AIServicePresets,
  createMockAIService,
  loadLogger,
} from "./ai.service.config";

export type { Logger } from "./ai.service";

// Reeksport z mapowań błędów dla convenience
export { fromAISDK } from "@/lib/errors/map-ai-sdk";
