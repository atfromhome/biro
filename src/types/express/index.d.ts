import type { VerifiedTokenOutput } from '~/utils/jwt'; // Impor tipe dari jwt.ts

declare global {
  namespace Express {
    export interface Request {
      user?: VerifiedTokenOutput;
    }
  }
}
