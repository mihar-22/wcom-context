import {
  defineCE,
  expect,
  fixture,
  html,
  unsafeStatic,
  aTimeout,
  waitUntil,
  elementUpdated,
} from "@open-wc/testing";
import { FakeConsumer } from "./FakeConsumer";
import { fakeContext, fakeContextTwo } from "./fakeContext";
import { FakeProvider } from "./FakeProvider";
import { FakeLitConsumer } from "./FakeLitConsumer";

const fakeConsumerTag = unsafeStatic(defineCE(FakeConsumer));
const fakeProviderTag = unsafeStatic(defineCE(FakeProvider));

async function buildFixture(): Promise<[FakeProvider, FakeConsumer]> {
  const provider = await fixture<FakeProvider>(html`
      <${fakeProviderTag}>
        <${fakeConsumerTag}></${fakeConsumerTag}>
      </${fakeProviderTag}>
    `);
  const consumer = provider.firstElementChild as FakeConsumer;
  return [provider, consumer];
}

describe("createContext", () => {
  it("should connect to provider", async () => {
    const [provider] = await buildFixture();
    provider.context = 20;
    const consumer = provider.firstElementChild as FakeConsumer;
    expect(consumer.context).to.equal(20);
    expect(consumer.contextCopy).to.equal(20);
    expect(consumer.contextTwo).to.equal(fakeContextTwo.defaultValue);
  });

  // TODO: Works but not sure yet how to test errors thrown.
  it.skip("should timeout if no provider can be found", async () => {
    await fixture<FakeProvider>(html`
      <${fakeConsumerTag}></${fakeConsumerTag}>
    `);

    await aTimeout(1200);
  });

  it("should only use the closest provider", async () => {
    const providerA = await fixture<FakeProvider>(html`
      <${fakeProviderTag}>
        <${fakeProviderTag}>
          <${fakeConsumerTag}></${fakeConsumerTag}>
        </${fakeProviderTag}>
      </${fakeProviderTag}>
    `);

    const providerB = providerA.firstElementChild as FakeProvider;
    const consumer = providerB.firstElementChild as FakeConsumer;

    providerA.context = 20;
    expect(providerB.context).to.equal(fakeContext.defaultValue);
    expect(consumer.context).to.equal(fakeContext.defaultValue);
    expect(consumer.contextCopy).to.equal(fakeContext.defaultValue);

    providerB.context = 30;
    expect(providerA.context).to.equal(20);
    expect(providerB.context).to.equal(30);
    expect(consumer.context).to.equal(30);
    expect(consumer.contextCopy).to.equal(30);
  });

  it("should disconnect when provider is disconnected", async () => {
    const [provider, consumer] = await buildFixture();

    provider.remove();
    await waitUntil(() => !provider.isConnected);

    provider.context = 50;
    expect(consumer.context).to.equal(fakeContext.defaultValue);
  });

  it("should disconnect when consumer is disconnected", async () => {
    const [provider, consumer] = await buildFixture();

    consumer.remove();
    await waitUntil(() => !consumer.isConnected);

    provider.context = 50;
    expect(consumer.context).to.equal(fakeContext.defaultValue);
  });

  it("should transform context", async () => {
    const [provider, consumer] = await buildFixture();
    expect(consumer.transformedContext).to.equal("applesTransformed");
    provider.contextTwo = "chicken";
    expect(consumer.transformedContext).to.equal("chickenTransformed");
  });

  it("should reconnect to same provider", async () => {
    const [provider, consumer] = await buildFixture();

    consumer.remove();
    await waitUntil(() => !consumer.isConnected);

    provider.appendChild(consumer);
    await waitUntil(() => consumer.isConnected);

    provider.context = 50;
    expect(consumer.context).to.equal(50);
  });

  it("should work with lit element without integrations", async () => {
    const provider = await fixture<FakeProvider>(html`
      <${fakeProviderTag}>
        <fake-lit-consumer></fake-lit-consumer>
      </${fakeProviderTag}>
    `);

    const consumer = provider.firstElementChild as FakeLitConsumer;
    expect(consumer).to.be.instanceOf(FakeLitConsumer);

    // Update `contextTwo` from provider.
    provider.contextTwo = "chicken";
    await elementUpdated(consumer);
    expect(consumer.context).to.equal(fakeContext.defaultValue);
    expect(consumer.contextTwo).to.equal("chicken");
    expect(consumer).shadowDom.to.equal(
      "<div>chicken - 10 - chickenTransformed</div>"
    );

    // Update `context` from provider.
    provider.context = 20;
    await elementUpdated(consumer);
    expect(consumer.context).to.equal(20);
    expect(consumer.contextTwo).to.equal("chicken");
    expect(consumer).shadowDom.to.equal(
      "<div>chicken - 20 - chickenTransformed</div>"
    );

    // Update `context` prop directly from consumer (anti-pattern??).
    consumer.context = 30;
    await elementUpdated(consumer);
    expect(consumer.context).to.equal(30);
    expect(consumer).shadowDom.to.equal(
      "<div>chicken - 30 - chickenTransformed</div>"
    );
  });
});

describe("provideContextRecord", () => {
  it("should provide context record", async () => {
    const [provider, consumer] = await buildFixture();

    (provider as any).ctxA = 12.5;
    expect(consumer.ctxA).to.equal(12.5);

    provider.contextAccessor.ctxA = 20;
    expect(consumer.ctxA).to.equal(20);

    (provider as any).ctxB = "soup";
    expect(consumer.ctxB).to.equal("soup");

    provider.contextAccessor.ctxB = "chicken";
    expect(consumer.ctxB).to.equal("chicken");
  });

  it("should derive context", async () => {
    const [provider, consumer] = await buildFixture();
    expect(consumer.ctxC).to.equal(`${fakeContext.defaultValue} apples`);
    provider.context = 50;
    expect(consumer.ctxC).to.equal(`50 apples`);
    // provider.context = 100;
    // expect(consumer.ctxC).to.equal(`100 apples`);
  });
});

describe("derivedContext", () => {
  it("should derive context", async () => {
    const [provider, consumer] = await buildFixture();
    expect(consumer.derivedCtx).to.equal(`${fakeContext.defaultValue} apples`);
    provider.context = 50;
    expect(consumer.derivedCtx).to.equal(`50 apples`);
    provider.context = 100;
    expect(consumer.derivedCtx).to.equal(`100 apples`);
  });
});
