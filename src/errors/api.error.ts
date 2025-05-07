import type { ApiErrorCode } from '~/constants/errorCodes';
import type { FormattedZodErrorDetail } from '~/utils/error-formatter';

export class ApiError extends Error {
  public readonly details?: FormattedZodErrorDetail[];
  public readonly errorCode?: ApiErrorCode;
  public readonly statusCode: number;

  constructor(
    statusCode: number,
    message: string,
    errorCode?: ApiErrorCode,
    details?: FormattedZodErrorDetail[],
  ) {
    super(message);

    this.statusCode = statusCode;

    this.errorCode = errorCode;

    this.details = details;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
