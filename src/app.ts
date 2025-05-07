import type { Response, Express, Request } from 'express';

import express from 'express';

import { errorMiddleware } from '~/middlewares/error.middleware';
import authRouter from '~/routes/auth.routes';

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Helpdesk API is running!' });
});

app.use('/api/v1/auth', authRouter);

app.use(errorMiddleware);

export default app;
