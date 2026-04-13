import { describe, it, expect, beforeEach } from 'vitest';
import { Axon, AxonGraph } from './axon';

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
      State.Loading, // <--- ADDED: Self-loop to allow context updates in history
      State.Error, 
      State.Idle
    ],
    [State.Error]: [State.Idle]
  };

  beforeEach(() => {
    // Limit of 3: [State1, State2, State3]
    axon = Axon.create(State.Idle, { attempts: 0 }, graph, 3);
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
});