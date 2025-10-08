import { BuyRequestRepository, PlatformAccountRepository, UserRepository } from "../../repositories";
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
