import { Context } from "../types";
import baseCreateContext from '../';
import { getElement } from '@stencil/core';

/**
 * Creates a new context that enables data to be passed down the component tree without having 
 * to pass props down manually. Each context can only have a single provider which is responsible 
 * for updating the current value, however there can be many consumers who listen for changes 
 * to the current context. A context can be any data type such as a string, boolean, array, object 
 * etc. When updating an array or object make sure to create a new one instead of using methods like 
 * push or assigning a key to a value.
 * 
 * @param defaultValue - The initial value for this given context.
 */
export default function createContext<T>(defaultValue: T): Context<T> {
  return baseCreateContext(defaultValue, getElement)
}