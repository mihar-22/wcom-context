import { 
  property,
  internalProperty, 
  PropertyDeclaration,
} from "lit-element";
import createBaseContext from "..";
import { 
  ConnectableElement, 
  Context,
  PropertyDecorator,
} from "../types";

export interface ContextOptions<T> extends PropertyDeclaration<T>  {
  internal?: boolean
}

export interface LitContext<T> extends Context<T> {
  provide(options?: ContextOptions<T>): PropertyDecorator<ConnectableElement>
  consume(options?: ContextOptions<T>): PropertyDecorator<ConnectableElement>
}

/**
 * Creates a new context that enables data to be passed down the component tree without having 
 * to pass props down manually. Each context can only have a single provider which is responsible 
 * for updating the current value, however there can be many consumers who listen for changes 
 * to the current context. A context can be any data type such as a string, boolean, array, object 
 * etc. When updating an array or object make sure to create a new one instead of using methods like 
 * push or assigning a key to a value.
 * 
 * @param defaultValue - The initial value for this given context.
 */
export default function createContext<T>(defaultValue: T): LitContext<T> {
  const context = createBaseContext(defaultValue);
  const provideDecorator = context.provide;
  const consumeDecorator = context.consume;

  function contextDecorator(isProvider: boolean) {
    return function (options?: ContextOptions<T>) {
      return function (consumerProto: ConnectableElement, contextPropertyName: string) {
        const propDecorator = options?.internal
          ? internalProperty(options)
          : property(options);

        const contextDecorator = isProvider
          ? provideDecorator()
          : consumeDecorator();

        // Apply prop decorator to trigger `requestUpdate` when context updates.
        propDecorator(consumerProto, contextPropertyName);
        contextDecorator(consumerProto, contextPropertyName);
      }
    }
  }
  
  context.provide = contextDecorator(true);
  context.consume = contextDecorator(false);

  return context;
}
