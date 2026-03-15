/**
 * HTTP Service injection token for dependency injection.
 *
 * @description Matches the pattern used in LlmModule. Allows swapping
 * the HTTP service implementation in tests without importing HttpModule.
 */
export const HTTP_SERVICE_TOKEN = 'AnamnesisHttpService';
