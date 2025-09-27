import { Loading, SimpleForm, TextInput } from "@/shared/components/admin";
import { Button } from "@/shared/components/ui/button";
import { useGetOne, useNotify, useUpdate } from "ra-core";

export const PersonalSettingsCard = () => {
  const notify = useNotify();
  const { data: user, isLoading } = useGetOne("users", { id: "me" });
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdate();

  const handleUserUpdate = async (data: any) => {
    try {
      await updateUser("users", {
        id: "me",
        data: {
          telegramId: data.telegramId || null,
        },
      });
      notify("Personal settings saved successfully", { type: "success" });
    } catch (error) {
      notify("Error saving personal settings", { type: "error" });
    }
  };

  if (isLoading) return <Loading />;

  return (
    <SimpleForm
      record={user}
      onSubmit={handleUserUpdate}
      toolbar={
        <div className="flex justify-start">
          <Button type="submit" disabled={isUpdatingUser}>
            {isUpdatingUser ? "Saving..." : "Save"}
          </Button>
        </div>
      }
    >
      <TextInput
        source="telegramId"
        label="Telegram Chat ID"
        helperText="Your Telegram Chat ID for notifications (get it from @userinfobot)"
      />
    </SimpleForm>
  );
};
