/** RFC 7807, which is what the backend returns for every error. */
export type ProblemDetail = {
  status: number;
  title?: string;
  detail?: string;
  errors?: Record<string, string>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** Copy fit to put in front of a user. Never leaks a status code or a stack. */
  get userMessage(): string {
    if (this.status === 429) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (this.status >= 500) {
      return 'Something went wrong at our end. Please try again.';
    }
    if (this.status === 0) {
      return 'Cannot reach RideX. Check your connection.';
    }
    return this.message;
  }
}

export function toApiError(status: number, body: unknown): ApiError {
  const problem = body as ProblemDetail | null;
  const firstFieldError = problem?.errors ? Object.values(problem.errors)[0] : undefined;
  return new ApiError(
    status,
    problem?.detail ?? firstFieldError ?? 'Something went wrong.',
    problem?.errors,
  );
}
