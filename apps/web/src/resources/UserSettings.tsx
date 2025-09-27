import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { env } from "@/shared/env";
import { useNotify } from "ra-core";
import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  telegramId: string | null;
  liskinsApiKey: string | null;
}

export const UserSettings = () => {
  const [, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    telegramId: "",
    liskinsApiKey: "",
  });
  const notify = useNotify();

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${env.VITE_API_URL}/api/users/me`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          setFormData({
            name: data.name || "",
            telegramId: data.telegramId || "",
            liskinsApiKey: data.liskinsApiKey || "",
          });
        } else {
          notify("Failed to load profile", { type: "error" });
        }
      } catch (error) {
        notify("Error loading profile", { type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [notify]);

  // Save profile changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${env.VITE_API_URL}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          telegramId: formData.telegramId || null,
          liskinsApiKey: formData.liskinsApiKey || null,
        }),
      });

      if (response.ok) {
        const updatedData = await response.json();
        setProfile(updatedData);
        notify("Settings saved successfully", { type: "success" });
      } else {
        const error = await response.json();
        notify(error.error || "Failed to save settings", { type: "error" });
      }
    } catch (error) {
      notify("Error saving settings", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>User Settings</CardTitle>
          <CardDescription>Manage your account settings and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="telegramId">Telegram ID</Label>
              <Input
                id="telegramId"
                value={formData.telegramId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, telegramId: e.target.value })
                }
                placeholder="Your Telegram ID"
              />
              <p className="text-sm text-muted-foreground mt-2">Your Telegram ID for notifications</p>
            </div>

            <div>
              <Label htmlFor="liskinsApiKey">Liskins API Key</Label>
              <Input
                id="liskinsApiKey"
                type="password"
                value={formData.liskinsApiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, liskinsApiKey: e.target.value })
                }
                placeholder="Your Liskins API Key"
              />
              <p className="text-sm text-muted-foreground mt-2">Your API key for Liskins service</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !formData.name}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
