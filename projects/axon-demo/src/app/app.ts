import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Axon, AxonGraph } from '@ngx-axon/core';

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
  private readonly orderGraph: AxonGraph<OrderStatus, OrderContext> = {
    [OrderStatus.Draft]:    [OrderStatus.Pending, OrderStatus.Cancelled],
    [OrderStatus.Pending]:  [OrderStatus.Approved, OrderStatus.Rejected],
    [OrderStatus.Approved]: [OrderStatus.Shipped, OrderStatus.Cancelled],
    [OrderStatus.Rejected]: [OrderStatus.Draft, OrderStatus.Cancelled],
    [OrderStatus.Shipped]:  [], // Terminal state
    [OrderStatus.Cancelled]: [] // Terminal state
  };

  // 2. Initialize Axon
  readonly order = Axon.create<OrderStatus, OrderContext>(
    OrderStatus.Draft,
    { id: 'ORD-2026-99', customer: 'John Doe', total: 450.00, items: 3 },
    this.orderGraph
  );

  // 3. Simple Action wrappers
  submit() { this.order.go(OrderStatus.Pending); }
  approve() { this.order.go(OrderStatus.Approved); }
  reject() { this.order.go(OrderStatus.Rejected); }
  ship() { this.order.go(OrderStatus.Shipped); }
  cancel() { this.order.go(OrderStatus.Cancelled); }
  reset() { this.order.go(OrderStatus.Draft); }
}