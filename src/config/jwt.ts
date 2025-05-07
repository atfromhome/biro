import type { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';

interface JWTConfig {
  options: SignOptions;
  secret: string;
}

const config: JWTConfig = {
  options: {
    expiresIn: (process.env.JWT_EXPIRES_IN as StringValue | undefined | number) ?? '1d',
    algorithm: 'HS256',
  },
  secret: process.env.JWT_SECRET ?? 'YOUR_SUPER_SECRET_KEY',
};

export default config;
