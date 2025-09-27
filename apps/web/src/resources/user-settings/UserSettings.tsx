import { PersonalSettingsCard } from "./PersonalSettingsCard";
import { PlatformConfigurationsList } from "./PlatformConfigurationsList";

export const UserSettings = () => {
  return (
    <div className="w-full space-y-6 flex-1">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      </div>

      <PersonalSettingsCard />

      <PlatformConfigurationsList />
    </div>
  );
};
