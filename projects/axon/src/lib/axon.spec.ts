import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as angularCore from '@angular/core';
import {
  Axon,
  AxonGraph,
  configureAxon,
  resetAxonGlobalConfig
} from './axon';

enum State {
  Idle = 'Idle',
  Loading = 'Loading',
  Error = 'Error'
}

interface Context {
  attempts: number;
  errorMessage?: string;
}

describe('Axon Library', () => {
  let axon: Axon<State, Context>;

  const graph: AxonGraph<State, Context> = {
    [State.Idle]: [State.Loading],
    [State.Loading]: [
      State.Loading, // Self-loop to allow context updates in history
      State.Error,
      State.Idle
    ],
    [State.Error]: [State.Idle]
  };

  beforeEach(() => {
    resetAxonGlobalConfig();
    // Limit of 3: [State1, State2, State3]
    axon = Axon.create(State.Idle, { attempts: 0 }, graph, 3);
  });

  afterEach(() => {
    resetAxonGlobalConfig();
    vi.restoreAllMocks();
  });

  it('should restore context exactly as it was during undo', () => {
    // 1. Idle {0} -> Loading {1} (Valid)
    axon.go(State.Loading, (ctx) => ({ ...ctx, attempts: 1 }));

    // 2. Loading {1} -> Loading {2} (Valid now because of self-loop)
    axon.go(State.Loading, (ctx) => ({ ...ctx, attempts: 2 }));

    expect(axon.context().attempts).toBe(2);

    axon.undo(); // Back to Loading {1}
    expect(axon.state()).toBe(State.Loading);
    expect(axon.context().attempts).toBe(1);

    axon.undo(); // Back to Idle {0}
    expect(axon.state()).toBe(State.Idle);
    expect(axon.context().attempts).toBe(0);
  });

  it('should prune old history when limit is exceeded', () => {
    // Hist: [Idle] (Index 0)
    axon.go(State.Loading); // Hist: [Idle, Loading] (Index 1)
    axon.go(State.Error, (ctx) => ({ ...ctx, errorMessage: 'Fail' })); // Hist: [Idle, Loading, Error] (Index 2)

    // This 4th push exceeds limit 3. 
    // New Hist: [Loading, Error, Idle] (Index 2)
    axon.go(State.Idle);

    expect(axon.historySize).toBe(3);
    expect(axon.state()).toBe(State.Idle);

    axon.undo(); // To Error (Index 1)
    expect(axon.state()).toBe(State.Error);

    axon.undo(); // To Loading (Index 0)
    expect(axon.state()).toBe(State.Loading);

    // canUndo is now false because index 0 is the start of our "sliding window"
    expect(axon.canUndo()).toBe(false);
  });

  it('should handle states with no defined transitions in the graph', () => {
    // Error state in our graph has no outgoing transitions defined
    axon.go(State.Loading);
    axon.go(State.Error, (ctx) => ({ ...ctx, errorMessage: 'Fail' }));

    // Checking a transition from a state not in the graph (or with no entries)
    // This triggers the (this.graph[status] ?? []) branch
    expect(axon.can.Loading()).toBe(false);
  });

  it('should hit the cache in canGo on subsequent calls', () => {
    // First call creates the signal
    const firstSignal = axon.canGo(State.Loading);
    // Second call returns the cached signal
    const secondSignal = axon.canGo(State.Loading);

    expect(firstSignal).toBe(secondSignal);
  });

  it('should do nothing when undo/redo is called at the boundaries', () => {
    const initialState = axon.state();

    // At the start, undo should do nothing
    axon.undo();
    expect(axon.state()).toBe(initialState);

    // Go to a new state
    axon.go(State.Loading);
    const loadingState = axon.state();

    // At the end, redo should do nothing
    axon.redo();
    expect(axon.state()).toBe(loadingState);
  });

  it('should return the current status via the is() helper', () => {
    expect(axon.is(State.Idle)).toBe(true);
    expect(axon.is(State.Loading)).toBe(false);
  });

  it('should return false when calling go() on an invalid transition', () => {
    // Idle -> Error is not in our graph
    const result = axon.go(State.Error);
    expect(result).toBe(false);
    expect(axon.state()).toBe(State.Idle);
  });

  it('should support object-based transitions with guards', () => {
    const guardedGraph: AxonGraph<State, Context> = {
      [State.Idle]: [
        {
          to: State.Loading,
          guard: (ctx) => ctx.attempts < 1
        }
      ],
      // We need this so we can move back to Idle to test the guard again!
      [State.Loading]: [State.Idle]
    };

    const guardedAxon = Axon.create(State.Idle, { attempts: 0 }, guardedGraph);

    // 1. Guard passes initially
    expect(guardedAxon.can.Loading()).toBe(true);

    // 2. Transition and update context so attempts = 1
    guardedAxon.go(State.Loading, (ctx) => ({ ...ctx, attempts: 1 }));

    // 3. Move back to Idle (this works now because of the line we added above)
    guardedAxon.go(State.Idle);
    expect(guardedAxon.state()).toBe(State.Idle);

    // 4. Guard should now fail because attempts is 1
    expect(guardedAxon.can.Loading()).toBe(false);
    expect(guardedAxon.go(State.Loading)).toBe(false);
    expect(guardedAxon.state()).toBe(State.Idle); // Remained Idle
  });

  it('should discard the future history when branching (go after undo)', () => {
    // 1. Idle -> Loading -> Error
    axon.go(State.Loading);
    axon.go(State.Error);
    expect(axon.historySize).toBe(3);

    // 2. Undo back to Loading
    axon.undo();
    expect(axon.state()).toBe(State.Loading);
    expect(axon.canRedo()).toBe(true);

    // 3. Transition to a NEW state (Idle) instead of Redoing to Error
    axon.go(State.Idle);

    expect(axon.state()).toBe(State.Idle);
    expect(axon.historySize).toBe(3); // [Idle, Loading, Idle]
    expect(axon.canRedo()).toBe(false); // The 'Error' state is gone

    // Verify the "future" was pruned by trying to redo
    axon.redo();
    expect(axon.state()).toBe(State.Idle);
  });

  it('should successfully redo a state transition', () => {
    axon.go(State.Loading);
    expect(axon.canRedo()).toBe(false);

    axon.undo();
    expect(axon.canRedo()).toBe(true);

    axon.redo();
    expect(axon.state()).toBe(State.Loading);
    expect(axon.canRedo()).toBe(false);
  });

  it('should handle the go() call without an updater function', () => {
    // Current context is { attempts: 0 }
    axon.go(State.Loading);

    // Context should remain the same (reference preserved)
    expect(axon.context().attempts).toBe(0);
    expect(axon.state()).toBe(State.Loading);
  });

  it('should handle states completely missing from the graph definition', () => {
    // 1. Create a graph where 'Error' is NOT a key at all
    const incompleteGraph: AxonGraph<State, Context> = {
      [State.Idle]: [State.Loading],
      [State.Loading]: [State.Error]
    };

    const incompleteAxon = Axon.create(State.Idle, { attempts: 0 }, incompleteGraph);

    // 2. Move to Loading, then to Error
    incompleteAxon.go(State.Loading);
    incompleteAxon.go(State.Error);

    expect(incompleteAxon.state()).toBe(State.Error);

    // 3. Now we are in 'Error'. 
    expect(incompleteAxon.can.Idle()).toBe(false);
    expect(incompleteAxon.go(State.Idle)).toBe(false);
  });

  // =========================================================================
  // Memory Management & Teardown Lifecycle Tests
  // =========================================================================

  describe('Memory Management & Lifecycle (destroy)', () => {
    it('should initialize with isDestroyed set to false', () => {
      expect(axon.isDestroyed).toBe(false);
    });

    it('should set isDestroyed to true and clear history/references on destroy()', () => {
      axon.go(State.Loading);
      expect(axon.historySize).toBe(2);

      axon.destroy();

      expect(axon.isDestroyed).toBe(true);
      expect(axon.historySize).toBe(0);
    });

    it('should be idempotent when destroy() is called multiple times', () => {
      axon.destroy();
      expect(axon.isDestroyed).toBe(true);

      // Calling again should not throw or cause unexpected state
      expect(() => axon.destroy()).not.toThrow();
      expect(axon.isDestroyed).toBe(true);
    });

    it('should prevent state transitions (go) when destroyed', () => {
      axon.destroy();

      const result = axon.go(State.Loading);
      expect(result).toBe(false);
      expect(axon.state()).toBe(State.Idle); // Unchanged
    });

    it('should return false from canGo and can proxy when destroyed', () => {
      axon.destroy();

      expect(axon.canGo(State.Loading)()).toBe(false);
      expect(axon.can.Loading()).toBe(false);
    });

    it('should return false when evaluating a pre-existing canGo signal after destroy()', () => {
      const preCachedSignal = axon.canGo(State.Loading);
      expect(preCachedSignal()).toBe(true);

      axon.destroy();

      expect(preCachedSignal()).toBe(false);
    });

    it('should ignore undo and redo calls when destroyed', () => {
      axon.go(State.Loading);
      axon.destroy();

      const stateBeforeUndo = axon.state();
      axon.undo();
      expect(axon.state()).toBe(stateBeforeUndo);

      axon.redo();
      expect(axon.state()).toBe(stateBeforeUndo);
    });

    it('should automatically register destroy callback when injected inside DestroyRef context', () => {
      let registeredCleanupFn: (() => void) | undefined;

      const destroyRefMock: Partial<angularCore.DestroyRef> = {
        onDestroy: vi.fn((fn: () => void) => {
          registeredCleanupFn = fn;
          return () => { return; }; // Return a no-op cleanup function
        })
      };

      const customInjector: Partial<angularCore.EnvironmentInjector> = {
        get: (token: unknown) => {
          if (token === angularCore.DestroyRef) {
            return destroyRefMock;
          }
          return null;
        }
      };

      let injectedAxon: Axon<State, Context> | undefined;

      angularCore.runInInjectionContext(
        customInjector as unknown as angularCore.EnvironmentInjector,
        () => {
          injectedAxon = Axon.create(State.Idle, { attempts: 0 }, graph);
        }
      );

      expect(destroyRefMock.onDestroy).toHaveBeenCalledTimes(1);
      expect(injectedAxon?.isDestroyed).toBe(false);

      // Trigger the Angular DestroyRef lifecycle callback
      registeredCleanupFn?.();

      expect(injectedAxon?.isDestroyed).toBe(true);
    });

    it('should gracefully handle instantiation outside an Injection Context without error', () => {
      let unhandledAxon: Axon<State, Context> | undefined;

      expect(() => {
        unhandledAxon = Axon.create(State.Idle, { attempts: 0 }, graph);
      }).not.toThrow();

      expect(unhandledAxon).toBeDefined();
      expect(unhandledAxon?.isDestroyed).toBe(false);

      // Manual teardown works as fallback
      unhandledAxon?.destroy();
      expect(unhandledAxon?.isDestroyed).toBe(true);
    });

    it('should return false when evaluating a pre-existing canGo signal after destroy()', () => {
      // 1. Store reference to the computed signal BEFORE destroy
      const preCachedSignal = axon.canGo(State.Loading);
      expect(preCachedSignal()).toBe(true);

      // 2. Destroy the store (clears _canGoCache and sets _isDestroyed to true)
      axon.destroy();

      // 3. Evaluate the pre-existing signal reference directly
      // This executes the computed closure body and hits line 90: if (this._isDestroyed) return false;
      expect(preCachedSignal()).toBe(false);
    });
  });

  // =========================================================================
  // Developer Experience & Debug Logging Tests
  // =========================================================================

  describe('Developer Experience & Debug Logging', () => {
    it('should not log transitions by default when debug is unconfigured', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { return; });

      axon.go(State.Loading);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log transitions when debug: true is passed in instance options', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { return; });

      const debugAxon = Axon.create(State.Idle, { attempts: 0 }, graph, {
        debug: true,
        historyLimit: 10
      });

      debugAxon.go(State.Loading);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        '%c[ngx-axon]%c Idle ──> Loading %c| Context:',
        'color: #8b5cf6; font-weight: bold;',
        'color: inherit; font-weight: bold;',
        'color: #6b7280;',
        { attempts: 0 }
      );
    });

    it('should include store name in tag when name option is provided', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { return; });

      const namedAxon = Axon.create(State.Idle, { attempts: 0 }, graph, {
        debug: true,
        name: 'RowStore'
      });

      namedAxon.go(State.Loading);

      expect(consoleSpy).toHaveBeenCalledWith(
        '%c[ngx-axon: RowStore]%c Idle ──> Loading %c| Context:',
        'color: #8b5cf6; font-weight: bold;',
        'color: inherit; font-weight: bold;',
        'color: #6b7280;',
        { attempts: 0 }
      );
    });

    it('should log transitions globally when configureAxon({ debug: true }) is called', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { return; });

      configureAxon({ debug: true });

      const defaultAxon = Axon.create(State.Idle, { attempts: 0 }, graph);
      defaultAxon.go(State.Loading);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should allow instance debug: false to override global debug: true', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { return; });

      configureAxon({ debug: true });

      const mutedAxon = Axon.create(State.Idle, { attempts: 0 }, graph, {
        debug: false
      });

      mutedAxon.go(State.Loading);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should respect custom history limit when passed inside AxonOptions object', () => {
      const limitedAxon = Axon.create(State.Idle, { attempts: 0 }, graph, {
        historyLimit: 2
      });

      limitedAxon.go(State.Loading);
      limitedAxon.go(State.Error);
      limitedAxon.go(State.Idle);

      expect(limitedAxon.historySize).toBe(2);
    });

    it('should suppress log output when ngDevMode is explicitly false (production mode)', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { return; });

      // 1. Safely mock Angular production mode without 'any'
      const globalRef = globalThis as unknown as { ngDevMode?: boolean };
      const previousNgDevMode = globalRef.ngDevMode;
      globalRef.ngDevMode = false;

      try {
        // 2. Create store with debug explicitly enabled
        const debugAxon = Axon.create(State.Idle, { attempts: 0 }, graph, {
          debug: true
        });

        // 3. Trigger transition
        debugAxon.go(State.Loading);

        // 4. Assert that ngDevMode = false suppressed the log output
        expect(consoleSpy).not.toHaveBeenCalled();
      } finally {
        // 5. Restore original ngDevMode state
        globalRef.ngDevMode = previousNgDevMode;
      }
    });
  });
});