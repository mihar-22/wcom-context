import { createDeferredPromise, fireEventAndRetry, isFunction, notEqual } from './utils';
import { 
  ConsumerConnectEvent, 
  ConsumerConnectEventDetail, 
  ConsumerDisconnectEvent, 
  ProviderUpdateEvent,
} from './events';
import { 
  Context,
  Consumer,
  Provider,
  ProviderPropertyDescriptor,
} from './types';

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
export default function createContext<T>(
  defaultValue: T,
  getElement?: (ref: any) => HTMLElement,
): Context<T> {
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
      return function decorateContextProvider(providerProto, contextPropertyName) {
        const { connectedCallback, componentWillLoad, disconnectedCallback } = providerProto;
        
        function onConsumerConnect(this: Provider, event: Event) {
          // Validate event was dispatched by a pairable consumer.
          if (!ContextConsumerConnectEvent.validate(event)) return;

          // Stop propagation of the event to prevent pairing with similar
          // context providers.
          event.stopImmediatePropagation();

          const {
            onConnectToProvider, 
            onProviderUpdate,
          } = event.detail;
          
          const el = getElement?.(this) ?? this;

          // Add the consumer's `onProviderUpdate` callback as a listener to the
          // provider's context change event.
          el.addEventListener(ProviderUpdateEvent.TYPE, onProviderUpdate);

          const onDisconnectFromProvider = (event: Event) => {
            // Validate event was dispatched by a pairable consumer.
            if (!ContextConsumerDisconnectEvent.validate(event)) return;
            el.removeEventListener(ProviderUpdateEvent.TYPE, onProviderUpdate);
          };

          // The consumer will add the callback as a listener to its own 
          // `ContextConsumerDisconnectEvent`.
          onConnectToProvider(onDisconnectFromProvider);
          
          // Set the consumer's context to the provider's initial (or default) value.
          onProviderUpdate(new ContextProviderUpdateEvent(this[contextPropertyName]));  
        }
        
        const CONNECTED = Symbol(`@wcom/${contextPropertyName}`);

        function onConnected(this: Provider) {
          if ((this as any)[CONNECTED]) return;
          (this as any)[CONNECTED] = true;
          const el = getElement?.(this) ?? this;
          el.addEventListener(ConsumerConnectEvent.TYPE, onConsumerConnect);
        }

        providerProto.connectedCallback = function (this: Provider) {
          if (isFunction(connectedCallback)) connectedCallback.call(this);
          onConnected.call(this);
        };
       
        // For stencil.
        providerProto.componentWillLoad = function (this: Provider) {
          if (isFunction(componentWillLoad)) componentWillLoad.call(this);
          onConnected.call(this);
        };

        providerProto.disconnectedCallback = function (this: Provider) {
          const el = getElement?.(this) ?? this;
          el.removeEventListener(ConsumerConnectEvent.TYPE, onConsumerConnect);

          // Delete reference to privately stored context.
          contextMap.delete(this);

          delete (this as any)[CONNECTED];
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

        Object.defineProperty(providerProto, contextPropertyName, propertyDescriptor);
      };
    },

    consume() {
      return function decorateContextConsumer(consumerProto, contextPropertyName) {
        const { connectedCallback, componentWillLoad, disconnectedCallback } = consumerProto;

        const CONNECTED = Symbol(`@wcom/${contextPropertyName}`);

        async function onConnect(this: Consumer) {
          if ((this as any)[CONNECTED]) return;
          (this as any)[CONNECTED] = true;

          let stopLookingForProvider: () => void;

          const { 
            promise: waitForConnection, 
            resolve: connected 
          } = createDeferredPromise();

          const consumer = this;
          const el = getElement?.(this) ?? this;

          const detail: ConsumerConnectEventDetail = {
            onConnectToProvider(onDisconnectFromProvider) {
              stopLookingForProvider();

              // Some reason `once` doesn't work and this seems to be the only way all 
              // context providers disconnect properly.
              let off: () => void;

              el.addEventListener(
                ConsumerDisconnectEvent.TYPE,
                (e) => {
                  onDisconnectFromProvider(e);
                  off();
                  delete (consumer as any)[CONNECTED];
                },
              );

              off = () => el.removeEventListener(
                ConsumerDisconnectEvent.TYPE, 
                onDisconnectFromProvider
              );
              
              connected(consumer);
            },
            // The event payload contains a listener to be added to the paired provider's 
            // context change event.
            onProviderUpdate: (event: Event) => {
              // Validate event was dispatched by a pairable provider.
              if (!ContextProviderUpdateEvent.validate(event)) return;

              // Update consumer context. The property decorator will handle the equality validation.
              this[contextPropertyName] = event.detail;
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
            el, 
            new ContextConsumerConnectEvent(detail),
            onCouldNotFindProvider,
          );

          stopLookingForProvider = establishConnection.stop;
          establishConnection.start();

          return waitForConnection;
        }

        consumerProto.connectedCallback = function (this: Consumer) {
          if (isFunction(connectedCallback)) connectedCallback.call(this);
          onConnect.call(this);
        };
       
        // For stencil.
        consumerProto.componentWillLoad = function (this: Consumer) {
          return onConnect.call(this).then(() => componentWillLoad?.call(this));
        };

        consumerProto.disconnectedCallback = function () {
          const el = getElement?.(this) ?? this;
          el.dispatchEvent(new ContextConsumerDisconnectEvent());
          if (isFunction(disconnectedCallback)) disconnectedCallback.call(this);
        };
      };
    },
  };

  return context;
}
