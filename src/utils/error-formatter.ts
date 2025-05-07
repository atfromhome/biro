import { type ZodIssue } from 'zod';
import { ZodError } from 'zod';

export interface FormattedZodError {
  details: FormattedZodErrorDetail[];
  primaryMessage: string;
}

export interface FormattedZodErrorDetail {
  message: string;
  field: string;
}

export const formatZodError = (error: ZodError): FormattedZodError => {
  const issues: ZodIssue[] = error.issues;

  console.log(issues);

  const details: FormattedZodErrorDetail[] = issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  let primaryMessage = 'Input validasi gagal.';

  if (issues.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const firstIssue: ZodIssue = issues[0]!;

    const fieldName =
      firstIssue.path.length > 1 ? firstIssue.path.slice(1).join('.') : firstIssue.path[0];

    if (fieldName && typeof fieldName === 'string') {
      primaryMessage = firstIssue.message;
    } else {
      primaryMessage = firstIssue.message;
    }
  }

  return { primaryMessage, details };
};
