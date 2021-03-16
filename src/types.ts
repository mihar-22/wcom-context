export type PropertyDecorator<T> = (target: T, propertyKey: string) => void;

export type ClassDecorator = <T extends Function>(target: T) => T | void;

export interface ContextOptions<T> {
  /**
   * This can be used to transform/manipulate the value before it is consumed.
   */
  transform: (value: T) => T;
}

export type StopWatching = () => void;

export interface Context<T> {
  provide(): PropertyDecorator<any>;
  consume(options?: ContextOptions<T>): PropertyDecorator<any>;
  watch(el: HTMLElement, handle: (newValue: T) => void): StopWatching;
  defaultValue: T;
}

export interface DerivedContext<R> extends Omit<Context<R>, "provide"> {
  key: symbol;
  provide(): ClassDecorator;
}

export interface Consumer extends HTMLElement {
  [index: string]: any;
}

export interface Provider extends HTMLElement {
  [index: string]: any;
}

export interface ProviderPropertyDescriptor<T> extends PropertyDescriptor {
  get(this: Provider): T | undefined;
  set(this: Provider, newValue: T): void;
}

// V8 fails if the file contains no exports.
export const noop = () => {};
