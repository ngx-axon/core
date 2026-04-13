import { signal, computed, Signal, untracked, WritableSignal } from '@angular/core';

export type AxonGraph<S extends string | number, T> = Partial<Record<S, (S | { to: S; guard: (context: T) => boolean })[]>>;

export class Axon<S extends string | number, T> {
  private readonly _state: WritableSignal<{ status: S; context: T }>;
  private readonly _canGoCache = new Map<S, Signal<boolean>>();
  
  private history: { status: S; context: T }[] = [];
  private readonly _historyIndex = signal(0);

  readonly state = computed(() => this._state().status);
  readonly context = computed(() => this._state().context);

  readonly canUndo = computed(() => this._historyIndex() > 0);
  readonly canRedo = computed(() => this._historyIndex() < this.history.length - 1);

  readonly can: Record<S, Signal<boolean>> = new Proxy({} as Record<S, Signal<boolean>>, {
    get: (_, nextState: string | symbol) => this.canGo(nextState as S)
  });

  constructor(
    private initialState: S,
    private initialContext: T,
    private graph: AxonGraph<S, T>,
    private historyLimit: number = 50 // Default limit to prevent memory bloat
  ) {
    const initial = { status: this.initialState, context: this.initialContext };
    this._state = signal(initial);
    this.history = [initial];
  }

  static create<S extends string | number, T>(
    initialState: S,
    context: T,
    graph: AxonGraph<S, T>,
    historyLimit: number = 50
  ) {
    return new Axon<S, T>(initialState, context, graph, historyLimit);
  }

  canGo(nextState: S): Signal<boolean> {
    let canGoSignal = this._canGoCache.get(nextState);
    
    if (!canGoSignal) {
      canGoSignal = computed(() => {
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
    return canGoSignal;
  }

  go(nextState: S, updater?: (current: T) => T): boolean {
    return untracked(() => {
      if (this.canGo(nextState)()) {
        const nextContext = updater ? updater(this._state().context) : this._state().context;
        const newState = { status: nextState, context: nextContext };

        const currentIndex = this._historyIndex();
        
        // 1. If we are in the past, discard the future branches
        if (currentIndex < this.history.length - 1) {
          this.history = this.history.slice(0, currentIndex + 1);
        }

        // 2. Add new state
        this.history.push(newState);

        // 3. Enforce History Limit
        if (this.history.length > this.historyLimit) {
          this.history.shift(); // Remove the oldest entry
        }

        // 4. Sync state and index
        this._historyIndex.set(this.history.length - 1);
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
      this._state.set(this.history[prevIndex]);
    }
  }

  redo(): void {
    const currentIndex = this._historyIndex();
    if (currentIndex < this.history.length - 1) {
      const nextIndex = currentIndex + 1;
      this._historyIndex.set(nextIndex);
      this._state.set(this.history[nextIndex]);
    }
  }
  
  // Helper to check current history size
  get historySize(): number {
    return this.history.length;
  }

  is(status: S): boolean {
    return this._state().status === status;
  }
}
