import { Error, Loading, SimpleForm, TextInput } from "@/shared/components/admin";
import { Button } from "@/shared/components/ui/button";
import { useGetOne, useNotify, useUpdate } from "ra-core";

export const UserSettings = () => {
  const notify = useNotify();

  const { data: user, isLoading, error } = useGetOne("users", { id: "me" });
  const [update, { isLoading: isUpdating }] = useUpdate();

  const handleSave = async (data: any) => {
    try {
      await update("users", {
        id: "me",
        data: {
          telegramId: data.telegramId || null,
          liskinsApiKey: data.liskinsApiKey || null,
        },
      });
      notify("Settings saved successfully", { type: "success" });
    } catch (error) {
      notify("Error saving settings", { type: "error" });
    }
  };

  if (isLoading) return <Loading />;

  if (error) {
    return <Error error={error} resetErrorBoundary={() => {}} />;
  }

  return (
    <div className="w-full max-w-xl">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Settings</h2>
      <SimpleForm
        record={user}
        onSubmit={handleSave}
        toolbar={
          <div className="flex justify-start pt-4">
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Editable Settings */}
          <div className="space-y-4">
            <TextInput source="telegramId" label="Telegram ID" helperText="Your Telegram ID for notifications" />

            <TextInput
              source="liskinsApiKey"
              label="Liskins API Key"
              helperText="Your API key for Liskins service"
              type="password"
            />
          </div>
        </div>
      </SimpleForm>
    </div>
  );
};
