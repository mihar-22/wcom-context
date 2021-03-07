import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from "lit-element";
import { fakeContext, fakeContextTwo } from "./fakeContext";

@customElement("fake-lit-consumer")
export class FakeLitConsumer extends LitElement {
  @property()
  @fakeContext.consume()
  context = fakeContext.defaultValue;

  @internalProperty()
  @fakeContextTwo.consume()
  contextTwo = fakeContextTwo.defaultValue;

  @fakeContextTwo.consume({ transform: (v) => `${v}Transformed ` })
  transformedContext = fakeContextTwo.defaultValue;

  render() {
    return html`<div>
      ${this.contextTwo} - ${this.context} - ${this.transformedContext}
    </div>`;
  }
}
