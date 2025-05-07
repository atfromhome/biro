import type { ApiErrorCode } from '~/constants/errorCodes';

export class ActionError extends Error {
  public readonly errorCode?: ApiErrorCode;

  constructor(message: string, errorCode?: ApiErrorCode) {
    super(message);

    this.errorCode = errorCode;
    this.name = 'ActionError';

    Object.setPrototypeOf(this, ActionError.prototype);
  }
}
