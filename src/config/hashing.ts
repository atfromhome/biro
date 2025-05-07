interface HashingConfig {
  bcrypt: Record<'rounds', number>;
}

const config: HashingConfig = {
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 12),
  },
};

export default config;
