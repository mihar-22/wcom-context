import createContext from "..";

export const fakeContext = createContext(10);
export const fakeContextTwo = createContext("apples");

export const fakeContextRecord = {
  ctxA: createContext(10),
  ctxB: createContext("apples"),
};
