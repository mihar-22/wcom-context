# @wcom/context

[![package-badge]][package]
[![license-badge]][license]
[![coverage-badge]][coverage]
[![semantic-release-badge]][semantic-release]

[package]: https://www.npmjs.com/package/@wcom/context
[package-badge]: https://img.shields.io/npm/v/@wcom/context
[license]: https://github.com/mihar-22/wc-context/blob/master/LICENSE
[license-badge]: https://img.shields.io/github/license/mihar-22/wc-context
[coverage]: https://codecov.io/github/mihar-22/wc-context
[coverage-badge]: https://img.shields.io/codecov/c/github/mihar-22/wc-context.svg
[semantic-release]: https://github.com/semantic-release/semantic-release
[semantic-release-badge]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg

## Introduction

> The inner workings and implementation are thanks to [@furf](https://github.com/furf).

This library enables data to be passed down component trees without having to pass props down 
manually. This library is expected to be used with [TypeScript](https://www.typescriptlang.org), 
make sure to set `experimentalDecorators` to `true` in `tsconfig.json`. 

_This library currently does not work with Stencil, any PR is welcomed to add support!_

## Install

```bash
# npm
$: npm install @wcom/context

# yarn
$: yarn add @wcom/context

# pnpm
$: pnpm install @wcom/context
```

## Usage

If you've used `React.ContextProvider` before you should already have the concepts down. Simply when 
we create a context we receive a `provide` and `consume` decorator. Each context can only have a single 
provider who is responsible for updating the current value. However, each context can have many 
consumers who simply listen for updates on when the value is changed. A context can be any 
data type such as a `string`, `boolean`, `array`, `object` etc. 

**Important:** You might be familiar with this pattern by now but do no update arrays or objects in-place 
with methods like `array.push()` or `object[key] = value`, simply because this will mean the 
equality check will never be `false` so no provider update will be emitted. You can update an 
array like so `array = [...array, 'newValue']` and object like so `object = { ...object, [key]: value }`.

Here's a simple diagram:

- Provider (Let's pretend here we are providing some context)
  - Child A
    - Child B (Here we can consume that context without passing a prop from Provider -> A -> B).

One last thing to keep in mind is that a consumer will connect to it's nearest provider, for example: 

- Provider (Let's pretend here we are providing some context)
  - Child A
    - Provider (Here we are providing the same context)
      - Child B (This will consume the parent provider instead of the Provider higher in the tree).

### `createContext<T>(defaultValue T): Context<T>`

This is the bread and butter of this library. It simply creates a new `Context` which looks 
like this:

```ts
interface Context<T> {
  provide(): PropertyDecorator
  consume(): PropertyDecorator
  defaultValue?: T
}
```

1. Let's create our context...

```ts
import createContext from '@wcom/context';

export const myContext = createContext(10);
```

2. Setup a provider...

```ts
import { myContext } from './context';

class MyProvider extends HTMLElement {
  @myContext.provide()
  someContext = myContext.defaultValue;

  // Setup slot etc. ...

  // Update context by simply setting new values.
  onUpdateContext() {
    this.someContext = 20;
  }
}
```

3. Setup a consumer...

```ts
import { myContext } from './context';

class MyConsumer extends HTMLElement {
  // This will now be kept in-sync with the value in `MyProvider`.
  @myContext.consume()
  someContext = myContext.defaultValue;

   // ...
}
```

4. Implementation in DOM...

```html
<my-provider>
  <my-consumer></my-consumer>
</my-provider>
```

And you're done 🎉 &nbsp;That's all there is to it.

## Lit Example

The usage is exactly the same as above except you might want to trigger a re-render on changes,
so set a `@internalProperty` decorator accordingly like so...

```ts
import { myContext } from './context';
import { internalProperty, LitElement } from 'lit-element';

class MyComponent extends LitElement {
  @internalProperty()
  @myContext.consume()
  someContext = myContext.defaultValue;
  
  // ...
}
```

## Related Packages

- [`wc-create-app`](https://github.com/mihar-22/wc-create-app): Set up a modern web component library by running one command.
- [`wc-cli`](https://github.com/mihar-22/wc-cli): CLI tool to get your web component library ready for production.
- [`wc-events`](https://github.com/mihar-22/wc-events): Event decorators and helpers for web components.