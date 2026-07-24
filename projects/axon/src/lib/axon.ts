import { signal, computed, Signal, untracked, WritableSignal, inject, DestroyRef } from '@angular/core';

declare const ngDevMode: boolean | undefined;

/**
 * Narrowed transition type to avoid 'any' in logic gates.
 */
export type AxonTransition<S extends string | number, T> =
  | S
  | { readonly to: S; readonly guard: (context: T) => boolean };

export type AxonGraph<S extends string | number, T> = Readonly<Partial<Record<S, readonly AxonTransition<S, T>[]>>>;

export interface AxonOptions {
  readonly debug?: boolean;
  readonly historyLimit?: number;
  readonly name?: string;
}

export interface AxonGlobalConfig {
  debug?: boolean;
}

let globalConfig: AxonGlobalConfig = {
  debug: false
};

export function configureAxon(config: AxonGlobalConfig): void {
  globalConfig = { ...globalConfig, ...config };
}

export function resetAxonGlobalConfig(): void {
  globalConfig = { debug: false };
}

export class Axon<S extends string | number, T> {
  private readonly _state: WritableSignal<{ readonly status: S; readonly context: T }>;
  private readonly _canGoCache = new Map<S, Signal<boolean>>();
  
  // History is kept as a Readonly array to enforce immutable updates
  private _history: readonly { readonly status: S; readonly context: T }[] = [];
  private readonly _historyIndex = signal(0);
  private readonly _isDestroyed = signal(false);

  private readonly _debug?: boolean;
  private readonly _name?: string;
  private readonly historyLimit: number;

  readonly state = computed(() => this._state().status);
  readonly context = computed(() => this._state().context);

  readonly canUndo = computed(() => this._historyIndex() > 0);
  readonly canRedo = computed(() => this._historyIndex() < this._history.length - 1);

  /**
   * The 'Can' Proxy: Access reactive transition checks as properties.
   */
  readonly can: Record<S, Signal<boolean>> = new Proxy({} as Record<S, Signal<boolean>>, {
    get: (_, prop: string | symbol) => this.canGo(prop as S)
  });

  constructor(
    private readonly initialState: S,
    private readonly initialContext: T,
    private graph: AxonGraph<S, T>,
    options?: number | AxonOptions
  ) {
    if (typeof options === 'number') {
      this.historyLimit = options;
    } else {
      this.historyLimit = options?.historyLimit ?? 50;
      this._debug = options?.debug;
      this._name = options?.name;
    }

    const initial = { status: this.initialState, context: this.initialContext };
    this._state = signal(initial);
    this._history = [initial];

    // Automatically bind to Angular's DestroyRef if instantiated within an Injection Context
    try {
      const destroyRef = inject(DestroyRef, { optional: true });
      destroyRef?.onDestroy(() => this.destroy());
    } catch {
      // Instantiated outside an Injection Context (e.g., dynamic factory outside component initialization, loops, or unit tests).
      // Manual cleanup via axon.destroy() is required.
    }
  }

  static create<S extends string | number, T>(
    initialState: S,
    context: T,
    graph: AxonGraph<S, T>,
    options?: number | AxonOptions
  ): Axon<S, T> {
    return new Axon<S, T>(initialState, context, graph, options);
  }

  get isDestroyed(): boolean {
    return this._isDestroyed();
  }

  public destroy(): void {
    if (this._isDestroyed()) {
      return;
    }
    this._isDestroyed.set(true);

    // 1. Clear cached computed signals to allow GC of signal dependency nodes
    this._canGoCache.clear();

    // 2. Sever references to history and transition guard context closures
    this._history = [];
    this.graph = {} as AxonGraph<S, T>;
  }

  canGo(nextState: S): Signal<boolean> {
    if (this._isDestroyed()) {
      return computed(() => false);
    }

    let canGoSignal = this._canGoCache.get(nextState);
    
    if (!canGoSignal) {
      canGoSignal = computed(() => {
        if (this._isDestroyed()) return false;
        const { status, context } = this._state();
        const allowed = this.graph[status] ?? [];
        
        return allowed.some((entry: AxonTransition<S, T>) => {
          if (typeof entry === 'object' && entry !== null) {
            return entry.to === nextState && entry.guard(context);
          }
          return entry === nextState;
        });
      });
      
      this._canGoCache.set(nextState, canGoSignal);
    }
    return canGoSignal;
  }

  go(nextState: S, updater?: (current: T) => T): boolean {
    if (this._isDestroyed()) {
      return false;
    }

    return untracked(() => {
      if (this.canGo(nextState)()) {
        const fromStatus = this._state().status;
        const current = this._state().context;
        const newState = { 
          status: nextState, 
          context: updater ? updater(current) : current 
        };

        const currentIndex = this._historyIndex();
        
        // 1. Branching: If we are in the past, discard the "future"
        let nextHistory = currentIndex < this._history.length - 1 
          ? this._history.slice(0, currentIndex + 1) 
          : this._history;

        // 2. Immutably add the new state
        nextHistory = [...nextHistory, newState];

        // 3. Enforce limit by sliding the window
        if (nextHistory.length > this.historyLimit) {
          nextHistory = nextHistory.slice(1);
        }

        this._history = nextHistory;
        this._logTransition(fromStatus, nextState, newState.context);
        this._historyIndex.set(this._history.length - 1);
        this._state.set(newState);
        return true;
      }
      return false;
    });
  }

  undo(): void {
    if (this._isDestroyed()) return;
    const currentIndex = this._historyIndex();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      this._historyIndex.set(prevIndex);
      this._state.set(this._history[prevIndex]);
    }
  }

  redo(): void {
    if (this._isDestroyed()) return;
    const currentIndex = this._historyIndex();
    if (currentIndex < this._history.length - 1) {
      const nextIndex = currentIndex + 1;
      this._historyIndex.set(nextIndex);
      this._state.set(this._history[nextIndex]);
    }
  }

  get historySize(): number {
    return this._history.length;
  }

  is(status: S): boolean {
    return this._state().status === status;
  }

  private _logTransition(fromState: S, toState: S, context: T): void {
    if (typeof ngDevMode !== 'undefined' && !ngDevMode) {
      return;
    }

    const isDebug = this._debug ?? globalConfig.debug ?? false;
    if (!isDebug) {
      return;
    }

    const tag = this._name ? `[ngx-axon: ${this._name}]` : '[ngx-axon]';
    console.log(
      `%c${tag}%c ${fromState} ──> ${toState} %c| Context:`,
      'color: #8b5cf6; font-weight: bold;',
      'color: inherit; font-weight: bold;',
      'color: #6b7280;',
      context
    );
  }
}