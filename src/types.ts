export type PropertyDecorator<T> = (target: T, propertyKey: string) => void;

export interface Context<T> {
  provide(): PropertyDecorator<any>
  consume(): PropertyDecorator<any>
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

// V8 fails if the file contains no exports.
export const noop  = () => {};