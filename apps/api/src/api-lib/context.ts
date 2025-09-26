import type { AuthSession, AuthUser } from "@/auth/types";
import { getLogger } from "@/utils/logger";
import { prisma } from "@repo/prisma";
import type { ILogLayer } from "loglayer";

export type ApiContextParams = {
  log: ILogLayer;
  user?: AuthUser | null;
  session?: AuthSession | null;
};

export class ApiContext {
  readonly log: ILogLayer;
  readonly prisma = prisma;
  readonly user?: AuthUser | null;
  readonly session?: AuthSession | null;

  constructor(params: ApiContextParams) {
    this.log = params.log;
    this.user = params.user;
    this.session = params.session;
  }

  /**
   * Check if user is authenticated
   */
  get isAuthenticated(): boolean {
    return !!(this.user && this.session);
  }

  /**
   * Get user id or throw if not authenticated
   */
  get requireUserId(): string {
    if (!this.user?.id) {
      throw new Error("User not authenticated");
    }
    return this.user.id;
  }

  /**
   * Require authentication or throw error
   */
  requireAuth(): { user: AuthUser; session: AuthSession } {
    if (!this.user || !this.session) {
      throw new Error("Authentication required");
    }
    return { user: this.user, session: this.session };
  }
}

let requestlessContext: ApiContext;

/**
 * This is a singleton context that can be used outside of a request.
 * It will not have anything request-specific attached to it.
 */
export function getRequestlessContext(): ApiContext {
  if (!requestlessContext) {
    requestlessContext = new ApiContext({
      log: getLogger(),
    });
  }

  return requestlessContext;
}
