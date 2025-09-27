import { Loading, SimpleForm, TextInput } from "@/shared/components/admin";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
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
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">Error loading user profile. Please try again.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="container py-6 max-w-xl">
      <CardHeader>
        <CardTitle>User Settings</CardTitle>
        <CardDescription>Manage your account settings and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <SimpleForm
          record={user}
          onSubmit={handleSave}
          toolbar={
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Profile Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Name</div>
                  <div className="text-base">{user?.name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Email</div>
                  <div className="text-base">{user?.email}</div>
                </div>
              </div>
            </div>

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
      </CardContent>
    </Card>
  );
};
