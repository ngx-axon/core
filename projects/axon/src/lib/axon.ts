import { signal, computed, Signal, untracked } from '@angular/core';

/**
 * Defines the valid next states for any given state.
 * Supports simple state arrays or guarded transitions with context-aware logic.
 */
export type AxonGraph<S extends string | number, T = any> = {
  [K in S]?: Array<S | { to: S; guard: (context: T) => boolean }>;
};

/**
 * Axon: A Signal-native Finite State Machine for Angular 21+.
 * Engineered for multi-instance performance and absolute type safety.
 */
export class Axon<S extends string | number, T = any> {
  private readonly _state = signal<{ status: S; context: T }>({
    status: this.initialState,
    context: this.initialContext,
  });

  private _canGoCache = new Map<S, Signal<boolean>>();

  /** Reactive Signal representing the current state status */
  readonly state = computed(() => this._state().status);
  
  /** Reactive Signal representing the current data context */
  readonly context = computed(() => this._state().context);

  /** * The 'Can' Proxy: Access reactive transition checks as properties.
   * @example [disabled]="!axon.can.Processing()"
   */
  readonly can = new Proxy({} as any, {
    get: (_, nextState: string) => this.canGo(nextState as unknown as S)
  });

  constructor(
    private initialState: S,
    private initialContext: T,
    private graph: AxonGraph<S, T>
  ) {}

  /** Static factory for clean instantiation without 'new' */
  static create<S extends string | number, T>(
    initialState: S,
    context: T,
    graph: AxonGraph<S, T>
  ) {
    return new Axon<S, T>(initialState, context, graph);
  }

  /**
   * Returns a memoized Signal indicating if a transition is currently allowed.
   */
  canGo(nextState: S): Signal<boolean> {
    if (!this._canGoCache.has(nextState)) {
      const canGoSignal = computed(() => {
        const { status, context } = this._state();
        const allowed = this.graph[status] ?? [];
        
        return allowed.some(entry => {
          if (typeof entry === 'object' && entry !== null) {
            return entry.to === nextState && entry.guard(context);
          }
          return entry === nextState;
        });
      });
      
      this._canGoCache.set(nextState, canGoSignal);
    }
    return this._canGoCache.get(nextState)!;
  }

  /**
   * Triggers a state transition.
   * @param nextState The target state
   * @param updater Optional context update function
   * @returns boolean - Success of the transition
   */
  go(nextState: S, updater?: (current: T) => T): boolean {
    return untracked(() => {
      if (this.canGo(nextState)()) {
        this._state.update((prev) => ({
          status: nextState,
          context: updater ? updater(prev.context) : prev.context,
        }));
        return true;
      }
      return false;
    });
  }

  /** Current state check (Non-reactive for logic blocks) */
  is(status: S): boolean {
    return this._state().status === status;
  }
}