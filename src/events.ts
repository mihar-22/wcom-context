abstract class SelfValidatingEvent<T extends any = any> extends CustomEvent<T> {
  static validate(event: SelfValidatingEvent): event is SelfValidatingEvent {
    return event instanceof this;
  }
}

export interface ConsumerConnectEventDetail<T = any> {
  onConnectToProvider(onDisconnectFromProvider: (event: Event) => void): void
  onProviderUpdate(event: Event | CustomEvent<T>): void
}

export abstract class ConsumerConnectEvent extends SelfValidatingEvent<ConsumerConnectEventDetail> {
  static TYPE = '@wcom/connected';

  constructor(detail: ConsumerConnectEventDetail) {
    super(ConsumerConnectEvent.TYPE, {
      bubbles: true,
      composed: true,
      detail,
    });
  }
}

export abstract class ConsumerDisconnectEvent extends SelfValidatingEvent {
  static TYPE = '@wcom/disconnected';

  constructor() {
    super(ConsumerDisconnectEvent.TYPE, {
      bubbles: false,
    });
  }
}

export abstract class ProviderUpdateEvent<T> extends SelfValidatingEvent<T> {
  static TYPE = '@wcom/update';

  constructor(detail: T) {
    super(ProviderUpdateEvent.TYPE, {
      bubbles: false,
      detail,
    });
  }
}
