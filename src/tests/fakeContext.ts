import createContext, { derivedContext } from "..";

export const fakeContext = createContext(10);
export const fakeContextTwo = createContext("apples");

export const fakeDerivedContext = derivedContext(
  fakeContext,
  (n) => `${n} apples`
);

export const fakeContextRecord = {
  ctxA: createContext(10),
  ctxB: createContext("apples"),
  ctxC: derivedContext(fakeContext, (n) => `${n} apples`),
};
