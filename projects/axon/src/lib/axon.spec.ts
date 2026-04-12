import { describe, it, expect, beforeEach } from 'vitest';
import { Axon, AxonGraph } from './axon';

enum MockState { Idle = 'Idle', Running = 'Running' };

describe('Axon', () => {
  let axon: Axon<MockState, { count: number }>;
  const graph: AxonGraph<MockState> = {
    [MockState.Idle]: [MockState.Running]
  };

  beforeEach(() => {
    // Just instantiate it directly!
    axon = Axon.create(MockState.Idle, { count: 0 }, graph);
  });

  it('should initialize with the correct state', () => {
    expect(axon.state()).toBe(MockState.Idle);
  });

  it('should transition to a valid state', () => {
    const success = axon.go(MockState.Running);
    expect(success).toBe(true);
    expect(axon.state()).toBe(MockState.Running);
  });

  it('should reflect transition availability via "can" signal', () => {
    const canRun = axon.can.Running();
    expect(canRun).toBe(true);
    
    axon.go(MockState.Running);
    // Since we didn't define a transition from Running -> Running
    expect(axon.can.Running()).toBe(false);
  });
});