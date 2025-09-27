import { Loading } from "@/shared/components/admin";
import { useGetList } from "ra-core";
import { PlatformAccountCard } from "./PlatformAccountCard";

// Platform configurations - ideally from api-core, but keeping inline for now
const PLATFORM_CONFIGS = {
  LIS_SKINS: {
    name: "Lis Skins",
    description: "Configuration for Lis Skins platform",
    fields: [
      {
        name: "userId",
        label: "User ID",
        required: true,
        placeholder: "123456",
        helperText: "Your Lis Skins user ID",
      },
      {
        name: "apiKey",
        label: "API Key",
        required: true,
        placeholder: "Enter your API key",
        helperText: "Your Lis Skins API key for authentication",
      },
    ],
  },
  CS_MONEY: {
    name: "CS Money",
    description: "Configuration for CS Money platform",
    fields: [],
  },
};

export const PlatformConfigurationsListInner = () => {
  const { data: platformAccounts, isLoading, error } = useGetList("platform-accounts");

  if (isLoading) return <Loading />;

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading platform accounts</p>
        <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 border-b">
      {platformAccounts?.map((account) => {
        const config = PLATFORM_CONFIGS[account.platform as keyof typeof PLATFORM_CONFIGS];

        if (!config) return null;

        return (
          <PlatformAccountCard key={account.platform} platform={account.platform} account={account} config={config} />
        );
      })}
      <div className="xl:block hidden" />
    </div>
  );
};

export const PlatformConfigurationsList = () => {
  return (
    <div className="-mx-6 border-t flex-1">
      <h3 className="text-lg font-semibold border-b px-6 py-4">Platform Configurations</h3>
      <PlatformConfigurationsListInner />
    </div>
  );
};
