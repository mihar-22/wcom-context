export interface ConnectableElement {
  connectedCallback?(): void
  disconnectedCallback?(): void
}

export type PropertyDecorator<T> = (target: T, propertyKey: string) => void;

export interface Context<T> {
  provide(): PropertyDecorator<ConnectableElement>
  consume(): PropertyDecorator<ConnectableElement>
  defaultValue: T
}

export interface Consumer extends HTMLElement {
  [index: string]: any
}

export interface Provider extends HTMLElement {
  [index: string]: any
}

export interface ProviderPropertyDescriptor<T> extends PropertyDescriptor {
  get(this: Provider): T | undefined
  set(this: Provider, newValue: T): void
}
