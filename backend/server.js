import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import paymentsRouter from './routes/payments.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'epicalcos-backend' }));

app.use('/api', paymentsRouter);

app.use((err, _req, res, _next) => {
  console.error('[backend] error:', err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN === 'TU_ACCESS_TOKEN') {
    console.warn('[backend] ⚠️  MERCADOPAGO_ACCESS_TOKEN no configurado — el checkout va a fallar hasta que lo cargues en .env');
  }
});
