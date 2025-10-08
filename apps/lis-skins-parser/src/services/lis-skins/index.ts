import { BuyRequestRepository, PlatformAccountRepository, UserRepository } from "../../repositories";
import type { LisSkinsServiceConfig } from "./lis-skins-service";
import { LisSkinsService } from "./lis-skins-service";

// Export all types and classes
export * from "./buy-request-manager";
export * from "./connection-service";
export * from "./lis-skins-service";
export * from "./message-handler";
export * from "./token-manager";
export * from "./trade-service";

// Create singleton instance with default repositories
const buyRequestRepository = new BuyRequestRepository();
const platformAccountRepository = new PlatformAccountRepository();
const userRepository = new UserRepository();

export const lisSkinsService = new LisSkinsService(buyRequestRepository, platformAccountRepository, userRepository);

// Export factory function for custom configurations
export function createLisSkinsService(
  config?: LisSkinsServiceConfig,
  repositories?: {
    buyRequestRepository?: BuyRequestRepository;
    platformAccountRepository?: PlatformAccountRepository;
    userRepository?: UserRepository;
  },
): LisSkinsService {
  return new LisSkinsService(
    repositories?.buyRequestRepository ?? new BuyRequestRepository(),
    repositories?.platformAccountRepository ?? new PlatformAccountRepository(),
    repositories?.userRepository ?? new UserRepository(),
    config,
  );
}
