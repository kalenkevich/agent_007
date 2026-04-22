import React from 'react';

type ComponentProps = Record<string, unknown>;

export type DialogConfig = {
  id: string;
  component: React.ComponentType<ComponentProps>;
  props: ComponentProps;
};

class DialogService {
  private stack: DialogConfig[] = [];
  private subscribers: (() => void)[] = [];

  open(component: React.ComponentType<ComponentProps>, props: ComponentProps) {
    const id = crypto.randomUUID();
    this.stack = [
      ...this.stack,
      {id, component, props: {...props, dialogId: id}},
    ];
    this.notify();
    return id;
  }

  close(id: string) {
    this.stack = this.stack.filter((d) => d.id !== id);
    this.notify();
  }

  getStack() {
    return [...this.stack];
  }

  subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }
}

export const dialogService = new DialogService();
