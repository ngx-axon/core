# 🧠 Axon
[![CI Status](https://github.com/axon-state/core/actions/workflows/ci.yml/badge.svg)](https://github.com/axon-state/core/actions/workflows/ci.yml)
[![Release Status](https://github.com/axon-state/core/actions/workflows/release.yml/badge.svg)](https://github.com/axon-state/core/actions/workflows/release.yml)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by Signals](https://img.shields.io/badge/powered_by-signals-red?logo=angular&logoColor=white)](https://angular.io/guide/signals)

> **The Neural Pathway for Angular State Managment using Signals.**

Axon is a lightweight, signal-native Finite State Machine (FSM) designed for **Angular 21**. It replaces bloated state management patterns with a lean, mathematically certain approach to state transitions.

### Why Axon?
Modern Angular has moved beyond RxJS-heavy stores. Axon provides a **Signal-first** architecture that ensures your application logic is both predictable and incredibly fast.

* **⚡ Signal-Native:** Zero RxJS overhead. Built specifically for Angular's Zoneless future.
* **🛡️ Typestate Safety:** Eliminate "impossible" states at the architectural level.
* **🔄 Multi-Instance:** Effortlessly manage state for 1,000+ table rows, each with its own independent FSM.
* **🎯 Reactive Guards:** `canGo` signals automatically disable UI elements based on transition rules.
* **📦 Micro-Scale:** Under 2KB gzipped.

---

### Comparison: The Axon Edge

| Feature | Axon | NgRx / Redux | XState |
| :--- | :--- | :--- | :--- |
| **Learning Curve** | Minutes | Weeks | Days |
| **Boilerplate** | Ultra-Low | Extreme | Moderate |
| **Performance** | O(1) Signal Updates | O(n) Selector Checks | Event-Bus Overhead |
| **Multi-Instance** | Native (`new Axon`) | Complex (Factories) | Complex (Actors) |

---

### Quick Start

#### 1. Define your Graph
```typescript
enum FileState { Idle, Uploading, Success, Error }

const fileGraph: AxonGraph<FileState> = {
  [FileState.Idle]:      [FileState.Uploading],
  [FileState.Uploading]: [FileState.Success, FileState.Error],
  [FileState.Error]:     [FileState.Uploading]
};
```

#### 2. Initialize in your Component
```typescript
@Component({ ... })
export class UploadComponent {
  // Simple multi-instance support
  readonly axon = Axon.create(FileState.Idle, { progress: 0 }, fileGraph);

  upload() {
    if (this.axon.go(FileState.Uploading)) {
      // Logic...
    }
  }
}
```

#### 3. Reactive UI (Angular 21)
```html
<button 
  [disabled]="!axon.can.Uploading()" 
  (click)="upload()">
  Start Upload
</button>

<p>Status: {{ axon.state() }}</p>
```

---

### Advanced: Logic Guards
Axon allows you to define transitions that depend on the data context, not just the current state.

```typescript
const graph: AxonGraph<State, Context> = {
  [State.Draft]: [
    { 
      to: State.Published, 
      guard: (ctx) => ctx.content.length > 0 
    }
  ]
};
```

---

### License
MIT © 2026 [Marco Buschini] <marco.buschini@gmail.com>. Built for the future of Angular.