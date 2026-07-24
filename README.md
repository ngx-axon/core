# 🧠 Axon

[![CI Status](https://github.com/ngx-axon/core/actions/workflows/ci.yml/badge.svg)](https://github.com/ngx-axon/core/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ngx-axon/core/branch/main/graph/badge.svg)](https://codecov.io/gh/ngx-axon/core)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-orange.svg?style=flat-square)](https://github.com/ngx-axon/core/issues)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by Signals](https://img.shields.io/badge/powered_by-signals-red?logo=angular&logoColor=white)](https://angular.io/guide/signals)
[![Angular Version](https://img.shields.io/badge/angular-%3E%3D21.0.0-dd0031?style=flat-square&logo=angular)](https://angular.io/)
[![npm version](https://img.shields.io/npm/v/@ngx-axon/core?style=flat-square&logo=npm)](https://www.npmjs.com/package/@ngx-axon/core)
[![npm downloads](https://img.shields.io/npm/dm/@ngx-axon/core?style=flat-square)](https://www.npmjs.com/package/@ngx-axon/core)
[![Open in StackBlitz](https://img.shields.io/badge/Open%20in-StackBlitz-1389FD?style=flat&logo=stackblitz&logoColor=white)](https://stackblitz.com/github/ngx-axon/core)
[![Documentation](https://img.shields.io/badge/Documentation-Read%20Axion%20Guide-E03131?style=flat&logo=angular&logoColor=white)](https://ngx-axon.github.io/core/)

> **The Neural Pathway for Angular State Management using Signals.**

Axon is a lightweight, signal-native Finite State Machine (FSM) designed for **Angular 21**. It replaces bloated state management patterns with a lean approach based on FSMs, which guarantee mathematically predictable and reliable state transitions.

### Why Axon?

Modern Angular has moved beyond RxJS-heavy stores. Axon provides a **[Signal-first](https://angular.io/guide/signals)** architecture that ensures your application logic is both predictable and incredibly fast.

- **⚡ Signal-Native:** Zero RxJS overhead. Built specifically for Angular's Zoneless future.
- **🛡️ Typestate Safety:** Eliminate "impossible" states at the architectural level.
- **🔄 Multi-Instance:** Effortlessly manage state for 1,000+ table rows, each with its own independent FSM.
- **🎯 Reactive Guards:** `canGo` signals automatically disable UI elements based on transition rules.
- **📦 Micro-Scale:** Under 2KB gzipped.

---

### Comparison: The Axon Edge

| Feature            | Axon                                                         | NgRx / Redux         | XState             |
| :----------------- | :----------------------------------------------------------- | :------------------- | :----------------- |
| **Learning Curve** | Minutes                                                      | Weeks                | Days               |
| **Boilerplate**    | Ultra-Low                                                    | Extreme              | Moderate           |
| **Performance**    | O(1) Signal Updates (instant updates regardless of app size) | O(n) Selector Checks | Event-Bus Overhead |
| **Multi-Instance** | Native (`new Axon`)                                          | Complex (Factories)  | Complex (Actors)   |

---

### Quick Start

#### 1. Define your Graph

```typescript
enum FileState {
  Idle,
  Uploading,
  Success,
  Error,
}

const fileGraph: AxonGraph<FileState> = {
  [FileState.Idle]: [FileState.Uploading],
  [FileState.Uploading]: [FileState.Success, FileState.Error],
  [FileState.Error]: [FileState.Uploading],
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
<button [disabled]="!axon.can.Uploading()" (click)="upload()">Start Upload</button>

<p>Status: {{ axon.state() }}</p>
```

> **How does `axon.can.Uploading()` work?**  
> The `can` property provides a signal-based function for each possible state transition (e.g., `can.Uploading()`), returning `true` if the transition is currently allowed based on your FSM graph and any guards you define. This enables you to easily bind UI elements to the FSM's valid transitions.

### Debugging & Pathway Tracing

`ngx-axon` includes built-in, color-coded transition logging to help you visualize reactive data flow through your state pathways without cluttering your code with `console.log` statements.

Loggers are automatically disabled in production builds via Angular's `ngDevMode` check, ensuring zero performance overhead or bundle bloat in production environments.

#### Per-Instance Tracing

Enable debugging on a specific store instance by passing an `AxonOptions` object to `Axon.create()` or `new Axon()`. You can also assign a custom `name` to identify specific micro-stores (e.g., individual table rows or dynamic form nodes).

```typescript
import { Axon } from 'ngx-axon/core';

const rowStore = Axon.create(
  OrderState.Idle,
  { orderId: 'ORD-101', total: 49.99 },
  orderGraph,
  {
    debug: true,          // Enables color-coded console logs for this instance
    name: 'RowStore-101', // Custom tag prefix in console logs
    historyLimit: 20      // Retains history limit configuration
  }
);

// Trigger a transition
rowStore.go(OrderState.Processing);

```

**Console Output:**

```text
[ngx-axon: RowStore-101] Idle ──> Processing | Context: { orderId: 'ORD-101', total: 49.99 }

```

---

#### Global Debug Configuration

Enable tracing across all `Axon` instances in your application using `configureAxon()`. This is ideal during local development or when setting up environment-level toggles.

```typescript
import { configureAxon } from 'ngx-axon/core';
import { environment } from '../environments/environment';

// Enable debugging globally across all Axon stores
if (!environment.production) {
  configureAxon({ debug: true });
}

```

> **Note:** Instance-level configuration takes precedence over global configuration. If global debugging is enabled, passing `{ debug: false }` to a specific store will silence that instance.

---

#### Configuration Options Reference

The `AxonOptions` object replaces the optional `historyLimit` number parameter while remaining fully backward-compatible:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `debug` | `boolean` | `false` | Enables console logging for state transitions on this instance. |
| `name` | `string` | `undefined` | Optional identifier appended to log tags (e.g., `[ngx-axon: Name]`). |
| `historyLimit` | `number` | `50` | Maximum number of undo/redo history entries retained. |

To reset global settings (useful in test teardowns), use `resetAxonGlobalConfig()`:

```typescript
import { resetAxonGlobalConfig } from 'ngx-axon/core';

afterEach(() => {
  resetAxonGlobalConfig();
});

```

### Advanced: Logic Guards

Axon allows you to define transitions that depend on the data context, not just the current state.

```typescript
const graph: AxonGraph<State, Context> = {
  [State.Draft]: [
    {
      to: State.Published,
      guard: (ctx) => ctx.content.length > 0,
    },
  ],
};
```

## Architectural Recipes

### 1. HTTP Requests & Async Lifecycles

Managing async operations with raw booleans like `isLoading` or `isError` often leads to impossible UI states (e.g., displaying a loading spinner and an error banner simultaneously). `Axon` eliminates invalid states by modeling the API lifecycle as an explicit state machine graph.

```typescript
import { Component, inject, signal } from '@angular/core';
import { Axon, AxonGraph } from 'ngx-axon/core';

export type ApiState = 'Idle' | 'Loading' | 'Success' | 'Error';

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

export interface FetchContext<T> {
  readonly data: T | null;
  readonly error: string | null;
  readonly attempts: number;
}

const apiGraph: AxonGraph<ApiState, FetchContext<User>> = {
  Idle: ['Loading'],
  Loading: ['Success', 'Error'],
  Error: ['Loading', 'Idle'], // Retry or Reset
  Success: ['Loading', 'Idle'] // Refresh or Reset
};

@Component({
  selector: 'app-user-profile',
  standalone: true,
  template: `
    @if (axon.is('Loading')) {
      <p>Loading user profile (Attempt {{ axon.context().attempts }})...</p>
    }

    @if (axon.is('Success')) {
      <p>Welcome, {{ axon.context().data?.name }}!</p>
      <button (click)="fetchUser('123')">Refresh</button>
    }

    @if (axon.is('Error')) {
      <p class="error">{{ axon.context().error }}</p>
      <button (click)="fetchUser('123')">Retry</button>
    }
  `
})
export class UserProfileComponent {
  readonly axon = Axon.create<ApiState, FetchContext<User>>(
    'Idle',
    { data: null, error: null, attempts: 0 },
    apiGraph,
    { name: 'UserProfileStore' }
  );

  async fetchUser(userId: string): Promise<void> {
    // 1. Guard against duplicate or invalid concurrent requests
    const transitioned = this.axon.go('Loading', (ctx) => ({
      ...ctx,
      attempts: ctx.attempts + 1,
      error: null
    }));

    if (!transitioned) {
      return; // Request already in progress or transition guarded
    }

    try {
      const user = await this.mockApiCall(userId);
      this.axon.go('Success', (ctx) => ({ ...ctx, data: user }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user';
      this.axon.go('Error', (ctx) => ({ ...ctx, error: errorMessage }));
    }
  }

  private mockApiCall(id: string): Promise<User> {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ id, name: 'Alex Developer', email: 'alex@example.com' }), 1000)
    );
  }
}

```

**Why Axon Handles This Elegantly:**

* **Impossible State Elimination:** Your template cannot accidentally render both `Success` data and an `Error` message.
* **Concurrent Request Prevention:** Calling `fetchUser()` while state is already `'Loading'` automatically evaluates `axon.go('Loading')` to `false` based on the graph definition, preventing duplicate network calls.

---

### 2. Entity & Collection Management (Row-Level Micro-Stores)

When managing complex collections (like heavy data tables, Kanban boards, or order items), binding global store state to individual items forces unnecessary re-renders. `Axon` allows you to instantiate independent, micro-store instances per row with automated lifecycle teardown.

```typescript
import { Injectable } from '@angular/core';
import { Axon, AxonGraph } from 'ngx-axon/core';

export type RowState = 'Read' | 'Editing' | 'Saving' | 'Error';

export interface OrderRowContext {
  readonly id: string;
  readonly quantity: number;
  readonly price: number;
  readonly errorMessage?: string;
}

const rowGraph: AxonGraph<RowState, OrderRowContext> = {
  Read: ['Editing'],
  Editing: [
    'Read', // Cancel
    {
      to: 'Saving',
      guard: (ctx) => ctx.quantity > 0 && ctx.price >= 0 // Business Guard
    }
  ],
  Saving: ['Read', 'Error'],
  Error: ['Editing', 'Read']
};

export type RowAxon = Axon<RowState, OrderRowContext>;

@Injectable({ providedIn: 'root' })
export class OrderTableService {
  private readonly rows = new Map<string, RowAxon>();

  createRowStore(initial: OrderRowContext): RowAxon {
    const store = Axon.create<RowState, OrderRowContext>('Read', initial, rowGraph, {
      name: `OrderRow-${initial.id}`
    });
    this.rows.set(initial.id, store);
    return store;
  }

  getRowStore(id: string): RowAxon | undefined {
    return this.rows.get(id);
  }

  removeRow(id: string): void {
    const store = this.rows.get(id);
    if (store) {
      // Safely disconnect signal dependency nodes and sever graph references
      store.destroy();
      this.rows.delete(id);
    }
  }

  clearAll(): void {
    for (const store of this.rows.values()) {
      store.destroy();
    }
    this.rows.clear();
  }
}

```

**Why Axon Handles This Elegantly:**

* **Targeted Isolation:** Re-renders and reactive computation remain strictly scoped to the modified row.
* **Guaranteed Memory Safety:** Invoking `.destroy()` during row deletion breaks guard closures, clears cached signals, and ensures the Garbage Collector reclaims memory instantly.

---

### 3. Form State Integration & Guarded Submissions

Connecting Angular Reactive Forms or Signal Forms to an `Axon` pathway decouples business transition rules from form templates. Machine guards prevent invalid submissions at the state layer.

```typescript
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Axon, AxonGraph } from 'ngx-axon/core';

export type FormState = 'Pristine' | 'Editing' | 'Submitting' | 'Submitted' | 'Error';

export interface CheckoutFormContext {
  readonly email: string;
  readonly agreeToTerms: boolean;
  readonly serverError: string | null;
}

const checkoutGraph: AxonGraph<FormState, CheckoutFormContext> = {
  Pristine: ['Editing'],
  Editing: [
    'Editing', // Field updates
    {
      to: 'Submitting',
      // Machine-level Guard: Guarantees submission state cannot be reached without terms agreement
      guard: (ctx) => ctx.agreeToTerms && ctx.email.includes('@')
    }
  ],
  Submitting: ['Submitted', 'Error'],
  Error: ['Editing'],
  Submitted: ['Pristine']
};

@Component({
  selector: 'app-checkout-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submitCheckout()">
      <input type="email" formControlName="email" (input)="onFieldChange()" placeholder="Email" />
      
      <label>
        <input type="checkbox" formControlName="agreeToTerms" (change)="onFieldChange()" />
        I agree to terms
      </label>

      <!-- The 'can' proxy reactively checks machine guards -->
      <button type="submit" [disabled]="!axon.can.Submitting()">
        @if (axon.is('Submitting')) {
          Processing...
        } @else {
          Complete Checkout
        }
      </button>
    </form>
  `
})
export class CheckoutFormComponent {
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    agreeToTerms: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] })
  });

  readonly axon = Axon.create<FormState, CheckoutFormContext>(
    'Pristine',
    { email: '', agreeToTerms: false, serverError: null },
    checkoutGraph,
    { name: 'CheckoutForm' }
  );

  onFieldChange(): void {
    const rawValues = this.form.getRawValue();
    
    this.axon.go('Editing', (ctx) => ({
      ...ctx,
      email: rawValues.email,
      agreeToTerms: rawValues.agreeToTerms
    }));
  }

  async submitCheckout(): Promise<void> {
    const isAllowed = this.axon.go('Submitting');
    if (!isAllowed) {
      return; // Guard rejected transition (e.g. invalid form state)
    }

    try {
      await this.fakeSubmitApi(this.axon.context());
      this.axon.go('Submitted');
    } catch {
      this.axon.go('Error', (ctx) => ({ ...ctx, serverError: 'Payment failed' }));
    }
  }

  private fakeSubmitApi(_payload: CheckoutFormContext): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

```

**Why Axon Handles This Elegantly:**

* **Reactive Button Disabling:** `axon.can.Submitting()` is a memoized Angular Signal that automatically reflects both Angular form state and custom machine guards without template boilerplate.
* **Double-Submit Proof:** While in `'Submitting'`, transition to `'Submitting'` is disallowed by the graph definition, preventing repeated button clicks from firing multiple HTTP calls.

### License

MIT © 2026 [Marco Buschini] <marco.buschini@gmail.com>. Built for the future of Angular.
