import { fakeContext, fakeContextTwo } from "./fakeContext";

export class FakeConsumer extends HTMLElement {
  @fakeContext.consume()
  context = fakeContext.defaultValue;
  
  @fakeContext.consume()
  contextCopy = fakeContext.defaultValue;

  @fakeContextTwo.consume()
  contextTwo = fakeContextTwo.defaultValue;
}