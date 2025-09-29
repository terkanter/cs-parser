import { authClient } from "@/shared/auth/auth-client";
import type { AuthProvider } from "ra-core";

/**
 * Better Auth integration with React Admin AuthProvider
 * Relies entirely on Better Auth session management
 */
export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      // await authClient.signUp.email({
      //   email,
      //   password,
      //   name: "admin",
      // });

      const response = await authClient.signIn.email({
        email,
        password,
      });

      if (response.error) {
        throw new Error(response.error.message || "Invalid credentials");
      }

      return Promise.resolve();
    } catch (error) {
      throw new Error("Login failed. Please try again.");
    }
  },

  logout: async () => {
    try {
      await authClient.signOut();
      return Promise.resolve();
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      return Promise.resolve();
    }
  },

  checkAuth: async () => {
    try {
      const session = await authClient.getSession({});

      if (!session.data?.user) {
        throw new Error("No active session");
      }

      return Promise.resolve();
    } catch (error) {
      console.error("Auth check failed:", error);
      return Promise.reject(new Error("Authentication required"));
    }
  },

  checkError: async (error) => {
    const status = error?.status || error?.response?.status;

    if (status === 401 || status === 403) {
      // Better Auth will handle session cleanup
      return Promise.reject(error);
    }

    return Promise.resolve();
  },

  getPermissions: async () => {
    try {
      // Extract permissions from user or session
      const permissions = "user";

      return Promise.resolve(permissions);
    } catch (error) {
      console.error("Failed to get permissions:", error);
      return Promise.resolve("guest");
    }
  },

  getIdentity: async () => {
    try {
      const session = await authClient.getSession();

      if (!session.data?.user) {
        throw new Error("No user session found");
      }

      const user = session.data.user;

      // Format user data for React Admin
      const identity = {
        id: user.id,
        fullName: user.name || "Anonymous",
        avatar: user.image || "",
        email: user.email,
      };

      return Promise.resolve(identity);
    } catch (error) {
      console.error("Failed to get identity:", error);
      return Promise.reject(new Error("User identity not available"));
    }
  },
};
