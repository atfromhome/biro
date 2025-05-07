import { prisma } from '~/config/database';

import app from './app';

const port = process.env.APP_PORT ?? '9000';

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Berhasil terhubung ke database.');

    app.listen(port, () => {
      console.log(`Server berjalan di http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Gagal memulai server atau terhubung ke database:', error);

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
    console.log(`\nMenerima sinyal ${signal}, mematikan server...`);

    await prisma.$disconnect();

    console.log('Koneksi database ditutup.');

    process.exit(0);
  });
});
