export const isNull = (input: any): input is null => input === null;
export const isUndefined = (input: any): input is undefined =>
  typeof input === "undefined";

export const isNil = (input: any): input is null | undefined =>
  isNull(input) || isUndefined(input);

export const getConstructor = (input: any): object | undefined =>
  !isNil(input) ? input.constructor : undefined;

export const isFunction = (input: any): input is Function =>
  getConstructor(input) === Function;

// Borrowed from `lit-element`.
export const notEqual = (value: unknown, old: unknown): boolean => {
  // This ensures (old==NaN, value==NaN) always returns false.
  return old !== value && (old === old || value === value);
};

export function fireEventAndRetry<T>(
  el: HTMLElement,
  event: CustomEvent<T>,
  onFail?: () => void,
  frequency = 100,
  maxRetries = 10
) {
  let interval: number;
  let attempt = 0;
  let stop = false;

  const onStop = () => {
    window.clearInterval(interval);
    stop = true;
  };

  function onRetry() {
    if (stop) return;

    if (attempt === maxRetries) {
      onStop();
      onFail && onFail();
      return;
    }

    el.dispatchEvent(event);
    attempt += 1;
  }

  return {
    start() {
      onRetry();
      interval = window.setInterval(onRetry, frequency);
    },
    stop() {
      onStop();
    },
  };
}
