// Platform types and configurations for cross-app communication

export enum Platform {
  LIS_SKINS = "LIS_SKINS",
  CS_MONEY = "CS_MONEY",
}

// Platform-specific credential types
export interface LiskinsCredentials {
  userId: number | string;
  apiKey: string;
}

export type CsMoneyCredentials = Record<string, never>;

// Union type for all platform credentials
export type PlatformCredentials = {
  [Platform.LIS_SKINS]: LiskinsCredentials;
  [Platform.CS_MONEY]: CsMoneyCredentials;
};

// Platform account configuration
export interface PlatformAccount<T extends Platform = Platform> {
  id: string;
  platform: T;
  credentials: PlatformCredentials[T];
  userId: string;
}

// Platform configuration metadata
export interface PlatformConfig {
  name: string;
  description: string;
  fields: PlatformFieldConfig[];
}

export interface PlatformFieldConfig {
  name: string;
  label: string;
  type: "text" | "number" | "password";
  required: boolean;
  placeholder?: string;
  helperText?: string;
}

// Platform configurations
export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  [Platform.LIS_SKINS]: {
    name: "Lis Skins",
    description: "Configuration for Lis Skins platform",
    fields: [
      {
        name: "userId",
        label: "User ID",
        type: "number",
        required: true,
        placeholder: "123456",
        helperText: "Your Lis Skins user ID",
      },
      {
        name: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        placeholder: "Enter your API key",
        helperText: "Your Lis Skins API key for authentication",
      },
    ],
  },
  [Platform.CS_MONEY]: {
    name: "CS Money",
    description: "Configuration for CS Money platform",
    fields: [
      // Пока пустой, будет дополнен позже
    ],
  },
};

// Utility functions
export const getAllPlatforms = (): Platform[] => Object.values(Platform);

export const getPlatformConfig = (platform: Platform): PlatformConfig => PLATFORM_CONFIGS[platform];

export const getDefaultCredentials = (platform: Platform): PlatformCredentials[Platform] => {
  switch (platform) {
    case Platform.LIS_SKINS:
      return { userId: "", apiKey: "" } as LiskinsCredentials;
    case Platform.CS_MONEY:
      return {} as CsMoneyCredentials;
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
};
