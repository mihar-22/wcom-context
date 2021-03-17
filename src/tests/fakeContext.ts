import createContext, { derivedContext } from "..";

/**
 * TODO: Terrible names...
 */

export const fakeContext = createContext(10);
export const fakeContextTwo = createContext("apples");

export const fakeDerivedContext = derivedContext(
  [fakeContext] as const,
  (n) => `${n} apples`
);

export const fakeDerivedContextTwo = derivedContext(
  [fakeContext, fakeContextTwo] as const,
  (n, a) => `${n} apples ${a}`
);

export const fakeContextRecord = {
  ctxA: createContext(10),
  ctxB: createContext("apples"),
  ctxC: derivedContext([fakeContext], (n) => `${n} apples`),
};
