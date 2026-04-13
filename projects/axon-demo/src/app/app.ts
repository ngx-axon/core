import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Axon, AxonGraph } from '@ngx-axon/core'; // Adjusted path to your library file

enum OrderStatus {
  Draft = 'Draft',
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Shipped = 'Shipped',
  Cancelled = 'Cancelled'
}

interface OrderContext {
  id: string;
  customer: string;
  total: number;
  items: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // 1. Define the workflow rules (The Graph)
  // We mark it as Readonly to stay consistent with our Zero-Any architecture
  private readonly orderGraph: AxonGraph<OrderStatus, OrderContext> = {
    [OrderStatus.Draft]:     [OrderStatus.Pending, OrderStatus.Cancelled],
    [OrderStatus.Pending]:   [OrderStatus.Approved, OrderStatus.Rejected],
    [OrderStatus.Approved]:  [OrderStatus.Shipped, OrderStatus.Cancelled],
    [OrderStatus.Rejected]:  [OrderStatus.Draft, OrderStatus.Cancelled],
    [OrderStatus.Shipped]:   [], 
    [OrderStatus.Cancelled]: [] 
  };

  // 2. Initialize Axon with a history limit of 10
  readonly order = Axon.create<OrderStatus, OrderContext>(
    OrderStatus.Draft,
    { id: 'ORD-2026-99', customer: 'John Doe', total: 450.00, items: 3 },
    this.orderGraph,
    10 // History Limit
  );

  // 3. Simple Action wrappers
  submit(): void { this.order.go(OrderStatus.Pending); }
  approve(): void { this.order.go(OrderStatus.Approved); }
  reject(): void { this.order.go(OrderStatus.Rejected); }
  ship(): void { this.order.go(OrderStatus.Shipped); }
  cancel(): void { this.order.go(OrderStatus.Cancelled); }
  reset(): void { this.order.go(OrderStatus.Draft); }

  // 4. Time Travel Actions
  // Exposed for the buttons in app.html
  undo(): void {
    this.order.undo();
  }

  redo(): void {
    this.order.redo();
  }

  // 5. Reactive status shortcuts (Optional, but helps keep templates clean)
  canUndo = this.order.canUndo;
  canRedo = this.order.canRedo;
}