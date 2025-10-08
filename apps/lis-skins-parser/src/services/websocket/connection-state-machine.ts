import { logger } from "../../utils/logger";
import type { ConnectionState } from "./types";

type StateTransition = {
  from: ConnectionState["status"][];
  to: ConnectionState["status"];
  action?: () => void | Promise<void>;
};

export class ConnectionStateMachine {
  private currentState: ConnectionState;
  private readonly transitions: Map<string, StateTransition> = new Map();
  private stateListeners: ((state: ConnectionState) => void)[] = [];

  constructor(initialState: ConnectionState) {
    this.currentState = initialState;
    this.setupTransitions();
  }

  private setupTransitions(): void {
    // Define valid state transitions
    this.addTransition("connect", {
      from: ["disconnected", "failed"],
      to: "connecting",
    });

    this.addTransition("connected", {
      from: ["connecting", "reconnecting"],
      to: "connected",
    });

    this.addTransition("disconnect", {
      from: ["connected", "connecting", "reconnecting"],
      to: "disconnected",
    });

    this.addTransition("reconnect", {
      from: ["disconnected", "failed", "connected"],
      to: "reconnecting",
    });

    this.addTransition("fail", {
      from: ["connecting", "reconnecting"],
      to: "failed",
    });
  }

  private addTransition(name: string, transition: StateTransition): void {
    this.transitions.set(name, transition);
  }

  async transition(transitionName: string, updates?: Partial<ConnectionState>): Promise<boolean> {
    const transition = this.transitions.get(transitionName);
    if (!transition) {
      logger.error(`Unknown transition: ${transitionName}`);
      return false;
    }

    if (!transition.from.includes(this.currentState.status)) {
      logger.warn(
        `Invalid transition ${transitionName} from state ${this.currentState.status}. ` +
          `Valid states: ${transition.from.join(", ")}`,
      );
      return false;
    }

    const previousState = this.currentState.status;

    // Update state
    this.currentState = {
      ...this.currentState,
      ...updates,
      status: transition.to,
    };

    logger.info(`State transition: ${previousState} -> ${this.currentState.status} [${this.currentState.id}]`);

    // Execute transition action if any
    if (transition.action) {
      try {
        await transition.action();
      } catch (error) {
        logger.withError(error).error(`Error executing transition action for ${transitionName}`);
      }
    }

    // Notify listeners
    this.notifyStateChange();

    return true;
  }

  getState(): ConnectionState {
    return { ...this.currentState };
  }

  updateState(updates: Partial<ConnectionState>): void {
    this.currentState = {
      ...this.currentState,
      ...updates,
    };
    this.notifyStateChange();
  }

  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.stateListeners.indexOf(listener);
      if (index > -1) {
        this.stateListeners.splice(index, 1);
      }
    };
  }

  private notifyStateChange(): void {
    const state = this.getState();
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (error) {
        logger.withError(error).error("Error in state change listener");
      }
    }
  }

  isInState(...states: ConnectionState["status"][]): boolean {
    return states.includes(this.currentState.status);
  }

  canTransition(transitionName: string): boolean {
    const transition = this.transitions.get(transitionName);
    return transition ? transition.from.includes(this.currentState.status) : false;
  }
}
