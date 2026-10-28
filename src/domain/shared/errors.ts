/**
 * Base class for expected, business-meaningful failures. Each subclass carries
 * a stable machine-readable `code` that maps to the API error envelope.
 */
export class DomainError extends Error {
  readonly code: string;
  readonly details: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_FAILED', message, details);
    this.name = 'ValidationError';
  }
}
