import { defineCE, expect, fixture, html, unsafeStatic, aTimeout, waitUntil } from '@open-wc/testing';
import { FakeConsumer } from './FakeConsumer';
import { fakeContext, fakeContextTwo } from './fakeContext';
import { FakeProvider } from './FakeProvider';

const fakeConsumerTag = unsafeStatic(defineCE(FakeConsumer));
const fakeProviderTag = unsafeStatic(defineCE(FakeProvider));

describe('createContext', () => {
  it('should connect to provider', async () => {
    const provider = await fixture<FakeProvider>(html`
      <${fakeProviderTag}>
        <${fakeConsumerTag}></${fakeConsumerTag}>
      </${fakeProviderTag}>
    `);

    provider.context = 20;
    const consumer = provider.firstElementChild as FakeConsumer;
    expect(consumer.context).to.equal(20);
    expect(consumer.contextTwo).to.equal(fakeContextTwo.defaultValue);
  });

  // TODO: Works but not sure yet how to test errors thrown.
  it.skip('should timeout if no provider can be found', async () => {
    await fixture<FakeProvider>(html`
      <${fakeConsumerTag}></${fakeConsumerTag}>
    `);

    await aTimeout(1200);
  });
  
  it('should only use the closest provider', async () => {
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
    
    providerB.context = 30;
    expect(providerA.context).to.equal(20);
    expect(providerB.context).to.equal(30);
    expect(consumer.context).to.equal(30);
  });

  it('should disconnect when provider is disconnected', async () => {
    const provider = await fixture<FakeProvider>(html`
      <${fakeProviderTag}>
        <${fakeConsumerTag}></${fakeConsumerTag}>
      </${fakeProviderTag}>
    `);

    const consumer = provider.firstElementChild as FakeConsumer;
    
    provider.remove();
    await waitUntil(() => !provider.isConnected)

    provider.context = 50;
    expect(consumer.context).to.equal(fakeContext.defaultValue);
  });
  
  it('should disconnect when consumer is disconnected', async () => {
    const provider = await fixture<FakeProvider>(html`
      <${fakeProviderTag}>
        <${fakeConsumerTag}></${fakeConsumerTag}>
      </${fakeProviderTag}>
    `);

    const consumer = provider.firstElementChild as FakeConsumer;
    
    consumer.remove();
    await waitUntil(() => !consumer.isConnected);

    provider.context = 50;
    expect(consumer.context).to.equal(fakeContext.defaultValue);
  });

  it('should reconnect to same provider', async () => {
    const provider = await fixture<FakeProvider>(html`
      <${fakeProviderTag}>
        <${fakeConsumerTag}></${fakeConsumerTag}>
      </${fakeProviderTag}>
    `);

    const consumer = provider.firstElementChild as FakeConsumer;
    
    consumer.remove();
    await waitUntil(() => !consumer.isConnected);

    provider.appendChild(consumer);
    await waitUntil(() => consumer.isConnected);
    
    provider.context = 50;
    expect(consumer.context).to.equal(50);
  });
});