# 🧠 Axon

<p align="center">
  <b>The Neural Pathway for Angular State Management using Signals.</b>
</p>

<p align="center">
  <a href="https://github.com/ngx-axon/core/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/ngx-axon/core/ci.yml?branch=main&style=flat-square&logo=github&label=CI" alt="CI Status"></a>
  <a href="https://codecov.io/gh/ngx-axon/core"><img src="https://img.shields.io/codecov/c/github/ngx-axon/core/main?style=flat-square&logo=codecov" alt="Coverage"></a>
  <a href="https://www.npmjs.com/package/@ngx-axon/core"><img src="https://img.shields.io/npm/v/@ngx-axon/core?style=flat-square&logo=npm&color=red" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@ngx-axon/core"><img src="https://img.shields.io/npm/dm/@ngx-axon/core?style=flat-square" alt="npm downloads"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT"></a>
</p>

<p align="center">
  <a href="https://angular.dev"><img src="https://img.shields.io/badge/Angular-21.0%2B-dd0031?style=flat-square&logo=angular" alt="Angular Version"></a>
  <a href="https://angular.dev/guide/signals"><img src="https://img.shields.io/badge/Signals-Native-007acc?style=flat-square&logo=typescript" alt="Signals Native"></a>
  <a href="https://stackblitz.com/github/ngx-axon/core"><img src="https://img.shields.io/badge/Open%20in-StackBlitz-1389FD?style=flat-square&logo=stackblitz&logoColor=white" alt="StackBlitz"></a>
</p>

---

**Axon** is a lightweight, signal-native Finite State Machine (FSM) engineered for **Angular 21+**. It eliminates bloated state management patterns in favor of deterministic, mathematically predictable state pathways.

---

## 📋 Table of Contents

- [Key Features](#-key-features)
- [The Axon Edge (Comparison)](#-the-axon-edge-comparison)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Core Concepts & Advanced Usage](#-core-concepts--advanced-usage)
  - [Logic Guards](#1-logic-guards)
  - [Debugging & Pathway Tracing](#2-debugging--pathway-tracing)
  - [Memory Management & Teardown](#3-memory-management--teardown)
- [Architectural Recipes](#-architectural-recipes)
  - [1. HTTP Requests & Async Lifecycles](#1-http-requests--async-lifecycles)
  - [2. Entity & Collection Management (Row-Level Micro-Stores)](#2-entity--collection-management-row-level-micro-stores)
  - [3. Form State Integration & Guarded Submissions](#3-form-state-integration--guarded-submissions)
- [License](#-license)

---

## ✨ Key Features

- **⚡ Signal-Native:** Built specifically for Angular's zoneless future with zero RxJS overhead.
- **🛡️ Typestate Safety:** Mathematically eliminates impossible UI states at the architectural layer.
- **🔄 Multi-Instance Ready:** Instantly manage independent state for 1,000+ table rows or canvas nodes.
- **🎯 Reactive Transition Proxies:** `can` proxies automatically evaluate and disable UI triggers.
- **🔒 Automatic Memory Cleanup:** Seamlessly integrates with Angular's `DestroyRef` to prevent memory leaks.
- **📦 Micro-Footprint:** Less than 2KB gzipped with zero external dependencies.

---

## 📊 The Axon Edge (Comparison)

| Feature | **ngx-axon** | **NgRx / Redux** | **XState** |
| :--- | :--- | :--- | :--- |
| **Learning Curve** | **Minutes** | Weeks | Days |
| **Boilerplate** | **Ultra-Low** | High / Extreme | Moderate |
| **Performance** | **$O(1)$ Signal Updates** | $O(n)$ Selector Checks | Event-Bus Overhead |
| **Multi-Instance** | **Native** (`Axon.create()`) | Complex Factories | Complex Actor Model |
| **Angular Integration** | **Native Signals & `DestroyRef`** | RxJS Adapters | Custom Wrappers |

---

## 📦 Installation

```bash
npm install @ngx-axon/core

```

---

## 🚀 Quick Start

### 1. Define your Graph

```typescript
import { AxonGraph } from '@ngx-axon/core';

export enum FileState {
  Idle = 'Idle',
  Uploading = 'Uploading',
  Success = 'Success',
  Error = 'Error',
}

export const fileGraph: AxonGraph<FileState, number progress: { }> = {
  [FileState.Idle]: [FileState.Uploading],
  [FileState.Uploading]: [FileState.Success, FileState.Error],
  [FileState.Error]: [FileState.Uploading, FileState.Idle],
  [FileState.Success]: [FileState.Idle]
};

```

### 2. Initialize in your Component

```typescript
import { Component } from '@angular/core';
import { Axon } from '@ngx-axon/core';
import { FileState, fileGraph } from './file.graph';

@Component({
  selector: 'app-uploader',
  standalone: true,
  templateUrl: './uploader.component.html'
})
export class UploaderComponent {
  readonly axon = Axon.create(FileState.Idle, { progress: 0 }, fileGraph);

  startUpload(): void {
    if (this.axon.go(FileState.Uploading)) {
      // Execute upload logic...
    }
  }
}

```

### 3. Bind to the Reactive UI

```html
<!-- The 'can' proxy reactively checks valid transitions -->
<button [disabled]="!axon.can.Uploading()" (click)="startUpload()">
  Start Upload
</button>

<p>Status: <strong>{{ axon.state() }}</strong></p>

```

> [!TIP]
> **How does `axon.can.Uploading()` work?**
> The `can` property uses a JavaScript Proxy to map status transitions to cached Angular `Signal<boolean>` computations. It automatically evaluates state graph rules and logic guards without triggering unnecessary change detection cycles.

---

## 🛠️ Core Concepts & Advanced Usage

### 1. Logic Guards

In addition to state topology, transitions can be restricted using context-aware guard functions.

```typescript
import { AxonGraph } from '@ngx-axon/core';

export interface PostContext {
  title: string;
  content: string;
}

export const postGraph: AxonGraph<'Draft' | 'Published', PostContext> = {
  Draft: [
    {
      to: 'Published',
      // Transition is allowed ONLY if content is non-empty
      guard: (ctx) => ctx.content.trim().length > 0
    }
  ]
};

```

---

### 2. Debugging & Pathway Tracing

Axon includes built-in, color-coded transition tracing to help you visualize reactive signal flow without cluttering production builds.

```typescript
import { Axon } from '@ngx-axon/core';

const store = Axon.create(
  OrderState.Idle,
  { orderId: 'ORD-101', total: 49.99 },
  orderGraph,
  {
    debug: true,          // Enables color-coded console logs
    name: 'RowStore-101', // Custom identifier tag
    historyLimit: 20      // Undo/redo stack boundary
  }
);

store.go(OrderState.Processing);

```

**Console Output:**

```text
[ngx-axon: RowStore-101] Idle ──> Processing | Context: { orderId: 'ORD-101', total: 49.99 }

```

#### Global Debug Configuration

```typescript
import { configureAxon } from '@ngx-axon/core';
import { environment } from '../environments/environment';

if (!environment.production) {
  configureAxon({ debug: true });
}

```

> [!NOTE]
> Debug loggers check Angular's `ngDevMode` flag and are completely tree-shaken in production builds.

---

### 3. Memory Management & Teardown

Dynamically created micro-stores (e.g., inside service collections or table loops) are automatically garbage-collected when created inside an Angular Injection Context.

```typescript
// Inside a Component or Directive: DestroyRef automatically hooks up cleanup
readonly store = Axon.create(State.Idle, context, graph);

// Inside a Root Service or Dynamic Array: Explicitly release references
removeRow(id: string): void {
  const store = this.rowMap.get(id);
  if (store) {
    store.destroy(); // Clears cached signals & severs graph closures
    this.rowMap.delete(id);
  }
}

```

---

## 📐 Architectural Recipes

### 1. HTTP Requests & Async Lifecycles

Eliminate impossible UI states (e.g., displaying a loading spinner and an error banner simultaneously) by modeling API lifecycles explicitly.

```typescript
import { Component } from '@angular/core';
import { Axon, AxonGraph } from '@ngx-axon/core';

export type ApiState = 'Idle' | 'Loading' | 'Success' | 'Error';

export interface User {
  readonly id: string;
  readonly name: string;
}

export interface FetchContext<T> {
  readonly data: T | null;
  readonly error: string | null;
  readonly attempts: number;
}

const apiGraph: AxonGraph<ApiState, FetchContext<User>> = {
  Idle: ['Loading'],
  Loading: ['Success', 'Error'],
  Error: ['Loading', 'Idle'],
  Success: ['Loading', 'Idle']
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
    const transitioned = this.axon.go('Loading', (ctx) => ({
      ...ctx,
      attempts: ctx.attempts + 1,
      error: null
    }));

    if (!transitioned) return; // Disallows concurrent duplicate calls

    try {
      const user = await this.mockApiCall(userId);
      this.axon.go('Success', (ctx) => ({ ...ctx, data: user }));
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Failed to fetch user';
      this.axon.go('Error', (ctx) => ({ ...ctx, error }));
    }
  }

  private mockApiCall(id: string): Promise<User> {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ id, name: 'Alex Developer' }), 1000)
    );
  }
}

```

---

### 2. Entity & Collection Management (Row-Level Micro-Stores)

Avoid re-rendering heavy table components by assigning an independent, lightweight state machine to each row item.

```typescript
import { Injectable } from '@angular/core';
import { Axon, AxonGraph } from '@ngx-axon/core';

export type RowState = 'Read' | 'Editing' | 'Saving' | 'Error';

export interface OrderRowContext {
  readonly id: string;
  readonly quantity: number;
  readonly price: number;
}

const rowGraph: AxonGraph<RowState, OrderRowContext> = {
  Read: ['Editing'],
  Editing: [
    'Read',
    {
      to: 'Saving',
      guard: (ctx) => ctx.quantity > 0 && ctx.price >= 0
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

  removeRow(id: string): void {
    const store = this.rows.get(id);
    if (store) {
      store.destroy(); // Safely disconnects signals and clears GC references
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

---

### 3. Form State Integration & Guarded Submissions

Decouple business transition rules from template validation by binding Angular Reactive Forms directly to an Axon state graph.

```typescript
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Axon, AxonGraph } from '@ngx-axon/core';

export type FormState = 'Pristine' | 'Editing' | 'Submitting' | 'Submitted' | 'Error';

export interface CheckoutContext {
  readonly email: string;
  readonly agreeToTerms: boolean;
}

const checkoutGraph: AxonGraph<FormState, CheckoutContext> = {
  Pristine: ['Editing'],
  Editing: [
    'Editing',
    {
      to: 'Submitting',
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

  readonly axon = Axon.create<FormState, CheckoutContext>(
    'Pristine',
    { email: '', agreeToTerms: false },
    checkoutGraph,
    { name: 'CheckoutForm' }
  );

  onFieldChange(): void {
    const raw = this.form.getRawValue();
    this.axon.go('Editing', (ctx) => ({ ...ctx, ...raw }));
  }

  async submitCheckout(): Promise<void> {
    if (!this.axon.go('Submitting')) return;

    try {
      await this.fakeApiCall();
      this.axon.go('Submitted');
    } catch {
      this.axon.go('Error');
    }
  }

  private fakeApiCall(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

```

---

## 📄 License

MIT © 2026 [Marco Buschini](mailto:marco.buschini@gmail.com). Built for the future of Angular.