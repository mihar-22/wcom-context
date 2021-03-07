import { fakeContext, fakeContextTwo } from "./fakeContext";

export class FakeProvider extends HTMLElement {
  @fakeContext.provide()
  context = fakeContext.defaultValue;

  @fakeContextTwo.provide()
  contextTwo = fakeContextTwo.defaultValue;

  constructor() {
    super();

    const template = document.createElement("template");
    template.innerText = `<div>&#x3C;slot&#x3E;&#x3C;/slot&#x3E;</div>`;

    this.attachShadow({ mode: "open" });
    this.appendChild(template.content.cloneNode(true));
  }
}
