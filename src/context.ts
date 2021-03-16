import { fireEventAndRetry, isFunction, notEqual } from "./utils";
import {
  ConsumerConnectEvent,
  ConsumerConnectEventDetail,
  ConsumerDisconnectEvent,
  ProviderUpdateEvent,
} from "./events";
import {
  Context,
  Consumer,
  Provider,
  ProviderPropertyDescriptor,
  DerivedContext,
} from "./types";

/**
 * Derives a context from another that was created with `createContext`.
 *
 * @param context - The context to derive values from as it updates.
 * @param derivation - Takes the original context value and outputs the derived value.
 */
export function derivedContext<T, R>(
  context: Context<T>,
  derivation: (value: T) => R
): DerivedContext<R> {
  const CONSUME_KEY = (Symbol() as unknown) as string;
  const PROVIDE_KEY = (Symbol() as unknown) as string;
  const defaultValue = derivation(context.defaultValue);
  const derivedContext = createContext(defaultValue);

  return {
    defaultValue,
    consume() {
      return function consumeDerivedContext(consumerProto, propertyKey) {
        Object.defineProperty(consumerProto, CONSUME_KEY, {
          set(newValue: T) {
            this[propertyKey] = derivation(newValue);
          },
          enumerable: true,
          configurable: true,
        });

        context.consume()(consumerProto, CONSUME_KEY);
        derivedContext.consume()(consumerProto, propertyKey);
      };
    },
    provide() {
      return function provideDerivedContext(providerProto) {
        Object.defineProperty(providerProto, CONSUME_KEY, {
          set(newValue: T) {
            this[PROVIDE_KEY] = newValue;
          },
          enumerable: true,
          configurable: true,
        });

        context.provide()(providerProto, CONSUME_KEY);
        derivedContext.provide()(providerProto, PROVIDE_KEY);
      };
    },
  };
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
export function createContext<T>(defaultValue: T): Context<T> {
  // Private store of provider context values.
  const contextMap = new WeakMap<Provider, T>();

  // Privately declared events help context consumers and providers identify one another.
  class ContextConsumerConnectEvent extends ConsumerConnectEvent {
    static validate: (event: Event) => event is ContextConsumerConnectEvent;
  }

  class ContextConsumerDisconnectEvent extends ConsumerDisconnectEvent {
    static validate: (event: Event) => event is ContextConsumerDisconnectEvent;
  }

  class ContextProviderUpdateEvent extends ProviderUpdateEvent<T> {
    static validate: (event: Event) => event is ContextProviderUpdateEvent;
  }

  const context: Context<T> = {
    defaultValue,
    provide() {
      return function decorateContextProvider(
        providerProto,
        contextPropertyName
      ) {
        const { connectedCallback, disconnectedCallback } = providerProto;

        function onConsumerConnect(this: Provider, event: Event) {
          // Validate event was dispatched by a pairable consumer.
          if (!ContextConsumerConnectEvent.validate(event)) return;

          // Stop propagation of the event to prevent pairing with similar
          // context providers.
          event.stopImmediatePropagation();

          const { onConnectToProvider, onProviderUpdate } = event.detail;

          // Add the consumer's `onProviderUpdate` callback as a listener to the
          // provider's context change event.
          this.addEventListener(ProviderUpdateEvent.TYPE, onProviderUpdate);

          const onDisconnectFromProvider = (event: Event) => {
            // Validate event was dispatched by a pairable consumer.
            if (!ContextConsumerDisconnectEvent.validate(event)) return;
            this.removeEventListener(
              ProviderUpdateEvent.TYPE,
              onProviderUpdate
            );
          };

          // The consumer will add the callback as a listener to its own
          // `ContextConsumerDisconnectEvent`.
          onConnectToProvider(onDisconnectFromProvider);

          // Set the consumer's context to the provider's initial (or default) value.
          onProviderUpdate(
            new ContextProviderUpdateEvent(this[contextPropertyName])
          );
        }

        providerProto.connectedCallback = function (this: Provider) {
          this.addEventListener(ConsumerConnectEvent.TYPE, onConsumerConnect);
          if (isFunction(connectedCallback)) connectedCallback.call(this);
        };

        providerProto.disconnectedCallback = function (this: Provider) {
          this.removeEventListener(
            ConsumerConnectEvent.TYPE,
            onConsumerConnect
          );

          // Delete reference to privately stored context.
          contextMap.delete(this);

          if (isFunction(disconnectedCallback)) disconnectedCallback.call(this);
        };

        const propertyDescriptor: ProviderPropertyDescriptor<T> = {
          // Provider instance's stored value or context's default value
          get() {
            return contextMap.has(this) ? contextMap.get(this) : defaultValue;
          },
          // Stores the provider instance's context value and dispatches an update event.
          set(newValue: T) {
            if (notEqual(newValue, this[contextPropertyName])) {
              contextMap.set(this, newValue);
              this.dispatchEvent(new ContextProviderUpdateEvent(newValue));
            }
          },
          enumerable: true,
          configurable: true,
        };

        Object.defineProperty(
          providerProto,
          contextPropertyName,
          propertyDescriptor
        );
      };
    },

    consume(options) {
      const transform = (options && options.transform) || ((v) => v);

      return function decorateContextConsumer(
        consumerProto,
        contextPropertyName
      ) {
        const { connectedCallback, disconnectedCallback } = consumerProto;

        function onConnectToProvider(this: Consumer) {
          let stopLookingForProvider: () => void;

          const consumer = this;

          const detail: ConsumerConnectEventDetail = {
            onConnectToProvider(onDisconnectFromProvider) {
              stopLookingForProvider();

              // Some reason `once` doesn't work and this seems to be the only way all
              // context providers disconnect properly.
              let off: () => void;

              consumer.addEventListener(ConsumerDisconnectEvent.TYPE, (e) => {
                onDisconnectFromProvider(e);
                off();
              });

              off = () =>
                consumer.removeEventListener(
                  ConsumerDisconnectEvent.TYPE,
                  onDisconnectFromProvider
                );
            },
            // The event payload contains a listener to be added to the paired provider's
            // context change event.
            onProviderUpdate: (event: Event) => {
              // Validate event was dispatched by a pairable provider.
              if (!ContextProviderUpdateEvent.validate(event)) return;

              // Update consumer context. The property decorator will handle the equality validation.
              this[contextPropertyName] = transform(event.detail);
            },
          };

          const onCouldNotFindProvider = () => {
            throw Error(
              `Failed to find matching context provider for: \`${this.constructor.name}\``
            );
          };

          // Upon connection, the consumer dispatches an event to discover a
          // pairable context provider. A pairable context provider is an element
          // that has been decorated by the provider factory generated within the
          // same `createContext` scope.
          const establishConnection = fireEventAndRetry(
            this,
            new ContextConsumerConnectEvent(detail),
            onCouldNotFindProvider
          );

          stopLookingForProvider = establishConnection.stop;
          establishConnection.start();
        }

        consumerProto.connectedCallback = function (this: Consumer) {
          onConnectToProvider.call(this);
          if (isFunction(connectedCallback)) connectedCallback.call(this);
        };

        consumerProto.disconnectedCallback = function () {
          this.dispatchEvent(new ContextConsumerDisconnectEvent());
          if (isFunction(disconnectedCallback)) disconnectedCallback.call(this);
        };
      };
    },
  };

  return context;
}
