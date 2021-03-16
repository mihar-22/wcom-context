import { fakeContext, fakeContextRecord, fakeContextTwo } from "./fakeContext";

export class FakeConsumer extends HTMLElement {
  @fakeContext.consume()
  context = fakeContext.defaultValue;

  @fakeContext.consume()
  contextCopy = fakeContext.defaultValue;

  @fakeContextTwo.consume()
  contextTwo = fakeContextTwo.defaultValue;

  @fakeContextTwo.consume({ transform: (v) => `${v}Transformed` })
  transformedContext = fakeContextTwo.defaultValue;

  @fakeContextRecord.ctxA.consume()
  ctxA = fakeContextRecord.ctxA.defaultValue;

  @fakeContextRecord.ctxB.consume()
  ctxB = fakeContextRecord.ctxB.defaultValue;
}
