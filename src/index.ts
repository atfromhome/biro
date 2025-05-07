import { prisma } from '~/config/database';

import app from './app';
import logger from './config/logger';

const port = process.env.APP_PORT ?? '9000';

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Berhasil terhubung ke database.');

    app.listen(port, () => {
      logger.info(
        `Server berjalan di http://localhost:${port} (NODE_ENV: ${process.env.NODE_ENV ?? 'development'})`,
      );
    });
  } catch (error) {
    logger.error({ err: error }, 'Gagal memulai server atau terhubung ke database.');

    await prisma.$disconnect();

    process.exit(1);
  }
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
startServer();

const signals = ['SIGINT', 'SIGTERM'];

signals.forEach((signal) => {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  process.on(signal, async () => {
    logger.info(`Menerima sinyal ${signal}, mematikan server...`);

    await prisma.$disconnect();

    logger.info('Koneksi database ditutup.');

    process.exit(0);
  });
});
