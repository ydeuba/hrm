/** Source of the current time; injected so use cases are deterministic in tests. */
export interface Clock {
  now(): Date;
}
