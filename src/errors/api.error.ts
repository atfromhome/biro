import type { FormattedZodErrorDetail } from '~/utils/error-formatter';

export class ApiError extends Error {
  public readonly details?: FormattedZodErrorDetail[];
  public readonly statusCode: number;
  public readonly errorCode?: string;

  constructor(
    statusCode: number,
    message: string,
    errorCode?: string,
    details?: FormattedZodErrorDetail[],
  ) {
    super(message);

    this.statusCode = statusCode;

    this.errorCode = errorCode;

    this.details = details;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
