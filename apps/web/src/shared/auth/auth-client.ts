import { env } from "@/shared/env";
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_API_URL,
  plugins: [
    usernameClient(),
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
        },
      },
    }),
    // inferAdditionalFields<typeof auth>()],

    // Add other client plugins here as needed
  ],
});
