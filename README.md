# 🧠 Axon
[![CI Status](https://github.com/axon-state/core/actions/workflows/ci.yml/badge.svg)](https://github.com/axon-state/core/actions/workflows/ci.yml)
[![Release Status](https://github.com/axon-state/core/actions/workflows/release.yml/badge.svg)](https://github.com/axon-state/core/actions/workflows/release.yml)
[![codecov](https://codecov.io/gh/axon-state/core/branch/main/graph/badge.svg)](https://codecov.io/gh/axon-state/core)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-orange.svg?style=flat-square)](https://github.com/axon-state/core/issues)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by Signals](https://img.shields.io/badge/powered_by-signals-red?logo=angular&logoColor=white)](https://angular.io/guide/signals)
[![Angular Version](https://img.shields.io/badge/angular-%3E%3D21.0.0-dd0031?style=flat-square&logo=angular)](https://angular.io/)
[![npm version](https://img.shields.io/npm/v/@axon-state/core?style=flat-square&logo=npm)](https://www.npmjs.com/package/@axon-state/core)
[![npm downloads](https://img.shields.io/npm/dm/@axon-state/core?style=flat-square)](https://www.npmjs.com/package/@axon-state/core)

> **The Neural Pathway for Angular State Management using Signals.**

Axon is a lightweight, signal-native Finite State Machine (FSM) designed for **Angular 21**. It replaces bloated state management patterns with a lean approach based on FSMs, which guarantee mathematically predictable and reliable state transitions.

### Why Axon?
Modern Angular has moved beyond RxJS-heavy stores. Axon provides a **[Signal-first](https://angular.io/guide/signals)** architecture that ensures your application logic is both predictable and incredibly fast.

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
| **Performance** | O(1) Signal Updates (instant updates regardless of app size) | O(n) Selector Checks | Event-Bus Overhead |
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
import { Axon } from '@axon/core';

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

> **How does `axon.can.Uploading()` work?**  
> The `can` property provides a signal-based function for each possible state transition (e.g., `can.Uploading()`), returning `true` if the transition is currently allowed based on your FSM graph and any guards you define. This enables you to easily bind UI elements to the FSM's valid transitions.

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