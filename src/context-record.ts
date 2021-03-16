import { Context, DerivedContext } from "./types";
import { isDerivedContext, isFunction } from "./utils";

export type ContextRecord<R extends Record<string, unknown>> = {
  readonly [P in keyof R]: Context<R[P]>;
};

export type ContextRecordProvider<R extends Record<string, unknown>> = {
  -readonly [P in keyof R]: R[P];
};

/**
 * Class decorator that takes in a context record which is essentially an object containing
 * `0:M` contexts, and sets the decorator class as the provider of all the contexts within
 * the given record.
 *
 * In order to access the context properties you can either access them directly within your
 * class `this.myCtx`, or you can use `contextRecordProvider` provided by this library if you'd
 * like to access it from a single property such as `this.context.myContext`.
 *
 * @param record - The context record.
 * @param transformProviderName - Transforms the property name used when defined on the decorated
 * class for each context provider in the given record.
 *
 * @example
 * ```js
 * import createContext, { ContextRecord, provideContextRecord } from '@wcom/context';
 *
 * interface MyContextProps {
 *   a: number;
 *   b: string;
 *   c: boolean;
 * }
 *
 * const contextRecord: ContextRecord<MyContextProps> = {
 *   a: createContext(0),
 *   b: createContext('string'),
 *   c: createContext(false),
 * };
 *
 * \@provideContextRecord(contextRecord)
 * class MyComponent {}
 * ```
 */
export function provideContextRecord(
  record: ContextRecord<any>,
  transformProviderName = (prop: string) => prop
) {
  return function decorateContextRecordProvider(constructor: Function): void {
    const proto = constructor.prototype;
    Object.keys(record).forEach((prop) => {
      record[prop].provide()(proto, transformProviderName(prop));
    });
  };
}

/**
 * Property decorator that enables access to context properties initialized via
 * `provideContextRecord` through a single object such as `this.context.myCtx`.
 *
 * @param record - The context record.
 * @param transformProviderName - This should match whatever you pass into `provideContextRecord`.
 *
 * @example
 * ```js
 * import createContext, {
 *   ContextRecord,
 *   ContextRecordProvider,
 *   provideContextRecord,
 *   contextRecordProvider,
 * } from '@wcom/context';
 *
 * interface MyContextProps {
 *   [prop: string]: any;
 *   a: number;
 *   b: string;
 *   c: boolean;
 * }
 *
 * const contextRecord: ContextRecord<MyContextProps> = {
 *   a: createContext(0),
 *   b: createContext('string'),
 *   c: createContext(false),
 * };
 *
 * \@provideContextRecord(contextRecord)
 * class MyComponent {
 *   \@contextRecordProvider(contextRecord)
 *   context!: ContextRecordProvider<MyContextProps>;
 * }
 * ```
 */
export function contextRecordProvider(
  record: ContextRecord<any>,
  transformProviderName = (prop: string) => prop
) {
  return function decorateContextAccessor(
    proto: any,
    propertyKey: string
  ): void {
    const context = {};

    function init(this: any) {
      const provider = this;

      Object.keys(record).forEach((prop) => {
        const propName = transformProviderName(prop);

        const isDerived = isDerivedContext(record[prop]);
        const derivedCtx = !isDerived
          ? undefined
          : (record[prop] as DerivedContext<unknown, unknown>);

        Object.defineProperty(context, prop, {
          get: !isDerived
            ? () => provider[propName]
            : () =>
                derivedCtx!.derivation(provider[derivedCtx!.derivedFromKey]),
          set: !isDerived
            ? (newValue: unknown) => {
                provider[propName] = newValue;
              }
            : undefined,
          enumerable: true,
          configurable: true,
        });
      });
    }

    const { connectedCallback } = proto;
    proto.connectedCallback = function () {
      init.call(this);
      if (isFunction(connectedCallback)) connectedCallback.call(this);
    };

    Object.defineProperty(proto, propertyKey, {
      get() {
        return context;
      },
      enumerable: true,
      configurable: true,
    });
  };
}
