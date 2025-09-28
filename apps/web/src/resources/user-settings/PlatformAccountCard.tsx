import { NumberInput, SimpleForm, TextInput } from "@/shared/components/admin";
import { Button } from "@/shared/components/ui/button";
import { minValue, required, useNotify, useRefresh, useUpdate } from "ra-core";

interface PlatformConfig {
  name: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type?: "text" | "number" | "password";
    required: boolean;
    placeholder?: string;
    helperText?: string;
  }>;
}

interface PlatformAccount {
  id: string | null;
  platform: string;
  credentials: any;
  userId: string;
}

interface PlatformAccountCardProps {
  platform: string;
  account: PlatformAccount;
  config: PlatformConfig;
}

export const PlatformAccountCard = ({ platform, account, config }: PlatformAccountCardProps) => {
  const notify = useNotify();
  const refresh = useRefresh();

  // Use React Admin hooks for data fetching
  const [updatePlatformAccount] = useUpdate();

  const handleSave = async (data: any) => {
    try {
      await updatePlatformAccount("platform-accounts", {
        id: platform, // Use platform as ID for upsert
        data,
        meta: { method: "upsert" }, // Custom meta to indicate upsert operation
      });
      notify(`${config.name} settings saved`, {
        type: "success",
      });
      refresh(); // Refresh the data after update
    } catch (error) {
      notify("Error saving platform settings", { type: "error" });
      throw error;
    }
  };

  return (
    <div className="space-y-4 p-6 not-last:border-r">
      <div className="flex items-center gap-2">
        <h3 className="text-md font-semibold">{config.name}</h3>
      </div>

      {config.fields.length === 0 ? (
        <div className="text-sm py-4 text-muted-foreground">No configuration required for this platform yet.</div>
      ) : (
        <SimpleForm
          record={account.credentials}
          onSubmit={handleSave}
          toolbar={
            <div className="flex justify-start pt-4">
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          }
        >
          {config.fields.map((field) => {
            const InputComponent = field.type === "number" ? NumberInput : TextInput;
            const validation = [];

            if (field.required) {
              validation.push(required());
            }

            if (field.type === "number") {
              validation.push(minValue(1));
            }

            return (
              <InputComponent
                key={field.name}
                source={field.name}
                label={field.label}
                type={field.type === "password" ? "password" : undefined}
                validate={validation}
                helperText={field.helperText}
              />
            );
          })}
        </SimpleForm>
      )}
    </div>
  );
};
