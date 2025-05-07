import type { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';

interface JWTConfig {
  options: SignOptions;
  secret: string;
}

const config: JWTConfig = {
  options: {
    algorithm: 'HS256',
    expiresIn: (process.env.JWT_EXPIRES_IN as number | StringValue | undefined) ?? '1d',
  },
  secret: process.env.JWT_SECRET ?? 'YOUR_SUPER_SECRET_KEY',
};

export default config;
