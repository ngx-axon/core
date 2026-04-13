import { signal, computed, Signal, untracked, WritableSignal } from '@angular/core';

/**
 * Narrowed transition type to avoid 'any' in logic gates.
 */
export type AxonTransition<S extends string | number, T> =
  | S
  | { readonly to: S; readonly guard: (context: T) => boolean };

export type AxonGraph<S extends string | number, T> = Readonly<Partial<Record<S, readonly AxonTransition<S, T>[]>>>;

export class Axon<S extends string | number, T> {
  private readonly _state: WritableSignal<{ readonly status: S; readonly context: T }>;
  private readonly _canGoCache = new Map<S, Signal<boolean>>();
  
  // History is kept as a Readonly array to enforce immutable updates
  private _history: readonly { readonly status: S; readonly context: T }[] = [];
  private readonly _historyIndex = signal(0);

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
    private readonly graph: AxonGraph<S, T>,
    private readonly historyLimit = 50
  ) {
    const initial = { status: this.initialState, context: this.initialContext };
    this._state = signal(initial);
    this._history = [initial];
  }

  static create<S extends string | number, T>(
    initialState: S,
    context: T,
    graph: AxonGraph<S, T>,
    historyLimit = 50
  ): Axon<S, T> {
    return new Axon<S, T>(initialState, context, graph, historyLimit);
  }

  canGo(nextState: S): Signal<boolean> {
    let canGoSignal = this._canGoCache.get(nextState);
    
    if (!canGoSignal) {
      canGoSignal = computed(() => {
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
    return untracked(() => {
      if (this.canGo(nextState)()) {
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
        console.log('Transitioned with history: ', this._history);
        this._historyIndex.set(this._history.length - 1);
        this._state.set(newState);
        return true;
      }
      return false;
    });
  }

  undo(): void {
    const currentIndex = this._historyIndex();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      this._historyIndex.set(prevIndex);
      this._state.set(this._history[prevIndex]);
    }
  }

  redo(): void {
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
}