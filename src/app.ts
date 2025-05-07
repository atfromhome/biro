/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { Express, Request, Response } from 'express';

import express from 'express';
import pinoHttp from 'pino-http';

import logger from '~/config/logger';
import { errorMiddleware } from '~/middlewares/error.middleware';
import authRouter from '~/routes/auth.routes';
import userRouter from '~/routes/user.routes';

const app: Express = express();

const httpLogger = pinoHttp({
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    } else if (res.statusCode >= 300 && res.statusCode < 400) {
      return 'silent';
    }
    return 'info';
  },

  logger: logger,
  serializers: {
    req: (req) => {
      delete req.headers.authorization;

      return {
        id: req.id,
        method: req.method,
        params: req.params,
        query: req.query,
        remoteAddress: req.remoteAddress,
        url: req.url,
      };
    },
    res: (res) => {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
app.use(httpLogger);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Helpdesk API is running!' });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);

app.use(errorMiddleware);

export default app;
