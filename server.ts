import express from 'express';
import { createServer as createViteServer } from 'vite';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import dotenv from 'dotenv';
import { OnlineDB } from './utils/api';

dotenv.config();

const app = express();
const PORT = 3000;

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' });

app.use(express.json());

// API route to create payment preference
app.post('/api/create-payment', async (req, res) => {
  const { title, unit_price, quantity, tenantId, planType } = req.body;

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Mercado Pago access token not configured.' });
  }

  const host = req.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  const preference = {
    items: [
      {
        id: planType,
        title: title,
        unit_price: Number(unit_price),
        quantity: Number(quantity),
      },
    ],
    back_urls: {
        success: baseUrl,
        failure: baseUrl,
        pending: baseUrl
    },
    auto_return: 'approved' as 'approved',
    external_reference: `${tenantId}|${planType}` // Store tenantId and planType for webhook
  };

  try {
    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create({ body: preference });
    res.json({ id: response.id, init_point: response.init_point });
  } catch (error: any) {
    console.error('Error creating Mercado Pago preference:', error);
    const errorMessage = error.message || 'Failed to create payment preference.';
    res.status(500).json({ error: errorMessage, details: error });
  }
});

app.post('/api/webhook', async (req, res) => {
  const payment = req.body;

  if (payment.type === 'payment') {
    try {
            const paymentClient = new Payment(client);
      const data = await paymentClient.get({ id: payment.data.id });
      const externalReference = data.external_reference;

      if (externalReference) {
        const [tenantId, planType] = externalReference.split('|');
        const plans = {
          monthly: 1,
          quarterly: 3,
          yearly: 12
        }

        const months = plans[planType as keyof typeof plans];

        if (months) {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + months);

          // Update tenant subscription in your database
          // This is a placeholder for your actual database update logic
                    await OnlineDB.updateSubscription(tenantId, months, planType as any);
        }
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
    }
  }

  res.status(200).send('OK');
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
