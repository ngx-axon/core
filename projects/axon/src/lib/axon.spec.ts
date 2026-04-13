import { describe, it, expect, beforeEach } from 'vitest';
import { Axon, AxonGraph } from './axon';

// 1. Strict Typing for States and Context
enum MockState {
  Idle = 'Idle',
  Running = 'Running',
  Paused = 'Paused'
}

interface MockContext {
  count: number;
}

describe('Axon with Time Travel', () => {
  let axon: Axon<MockState, MockContext>;
  
  // 2. Define a graph that allows circular/complex movement for better testing
  const graph: AxonGraph<MockState, MockContext> = {
    [MockState.Idle]: [MockState.Running],
    [MockState.Running]: [MockState.Paused, MockState.Idle],
    [MockState.Paused]: [MockState.Running]
  };

  beforeEach(() => {
    // Initialize with a history limit of 2 to test pruning logic
    axon = Axon.create(MockState.Idle, { count: 0 }, graph, 2);
  });

  it('should initialize with correct state and disabled undo/redo', () => {
    expect(axon.state()).toBe(MockState.Idle);
    expect(axon.context().count).toBe(0);
    expect(axon.canUndo()).toBe(false);
    expect(axon.canRedo()).toBe(false);
  });

  it('should enable undo and restore context accurately', () => {
    // Move Idle (0) -> Running (1)
    axon.go(MockState.Running, (ctx) => ({ count: ctx.count + 1 }));
    
    expect(axon.state()).toBe(MockState.Running);
    expect(axon.context().count).toBe(1);
    expect(axon.canUndo()).toBe(true);

    // Perform Undo
    axon.undo();

    expect(axon.state()).toBe(MockState.Idle);
    expect(axon.context().count).toBe(0); // Context reverted
    expect(axon.canUndo()).toBe(false);
    expect(axon.canRedo()).toBe(true);
  });

  it('should handle redo and maintain context', () => {
    axon.go(MockState.Running, () => ({ count: 10 }));
    axon.undo();
    
    expect(axon.state()).toBe(MockState.Idle);
    
    axon.redo();
    
    expect(axon.state()).toBe(MockState.Running);
    expect(axon.context().count).toBe(10);
    expect(axon.canRedo()).toBe(false);
  });

  it('should wipe the "future" when branching after an undo', () => {
    // Timeline: [Idle] -> [Running]
    axon.go(MockState.Running);
    // Go back to Idle
    axon.undo(); 
    // Redo is available for Running
    expect(axon.canRedo()).toBe(true);

    // Perform a NEW action from Idle instead of redoing
    // In our graph, Idle only goes to Running, so we "branch" to Running again but with different data
    axon.go(MockState.Running, () => ({ count: 99 }));

    // Redo should now be wiped because we've created a new timeline
    expect(axon.canRedo()).toBe(false);
    expect(axon.historySize).toBe(2); 
    expect(axon.context().count).toBe(99);
  });

  it('should enforce history limit (sliding window)', () => {
    // Limit is 2. Currently history is [Idle]
    axon.go(MockState.Running); // History: [Idle, Running]
    axon.go(MockState.Paused);  // History: [Running, Paused] -> Idle is dropped

    expect(axon.historySize).toBe(2);
    expect(axon.state()).toBe(MockState.Paused);

    axon.undo(); // Goes back to Running
    expect(axon.state()).toBe(MockState.Running);

    // Second undo should fail because Idle was shifted out of the array
    axon.undo(); 
    expect(axon.state()).toBe(MockState.Running);
    expect(axon.canUndo()).toBe(false);
  });

  it('should maintain reactivity in the "can" proxy during time travel', () => {
    // At Idle: can go to Running
    expect(axon.can.Running()).toBe(true);
    
    axon.go(MockState.Running);
    // At Running: cannot go to Running (no self-loop), but can go to Paused
    expect(axon.can.Running()).toBe(false);
    expect(axon.can.Paused()).toBe(true);

    axon.undo();
    // Back at Idle: Proxy should reactively update
    expect(axon.can.Running()).toBe(true);
  });
});