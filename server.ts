import express from 'express';
import { createServer as createViteServer } from 'vite';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import dotenv from 'dotenv';
import cors from 'cors';
import { OnlineDB } from './utils/api';

dotenv.config();

const app = express();
const PORT = 3000;

const getMPClient = () => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN is not defined');
  }
  return new MercadoPagoConfig({ accessToken: token });
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.post('/api/create-preference', async (req, res) => {
  try {
    const { title, unit_price, quantity, tenantId, planType } = req.body;

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Mercado Pago access token not configured.' });
    }

    const origin = req.get('origin') || (req.get('referer') ? new URL(req.get('referer') as string).origin : null);
    const host = req.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const fallbackUrl = `${protocol}://${host}`;
    const baseUrl = origin || fallbackUrl;

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
        success: `${baseUrl}/`,
        failure: `${baseUrl}/`,
        pending: `${baseUrl}/`
      },
      auto_return: 'approved' as 'approved',
      external_reference: `${tenantId}|${planType}`
    };

    const client = getMPClient();
    const preferenceClient = new Preference(client);
    console.log('Creating preference for:', { tenantId, planType, unit_price });
    
    const response = await preferenceClient.create({ body: preference });
    console.log('Preference created successfully:', response.id);
    
    res.json({ id: response.id, init_point: response.init_point });

  } catch (error: any) {
    console.error('Error creating Mercado Pago preference:', error);
    const errorMessage = error.message || 'Failed to create payment preference.';
    res.status(500).json({ error: errorMessage, details: error });
  }
});

app.post(['/api/webhook', '/api/webhook/'], async (req, res) => {
  try {
    const payment = req.body;

    if (payment?.type === 'payment' || payment?.action === 'payment.updated') {
      const client = getMPClient();
      const paymentClient = new Payment(client);
      const paymentId = payment?.data?.id || payment?.id;
      
      if (paymentId) {
        const data = await paymentClient.get({ id: paymentId });
        const externalReference = data.external_reference;
        const status = data.status;

        if (externalReference && status === 'approved') {
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
            await OnlineDB.updateSubscription(tenantId, months, planType as any);
            console.log(`Subscription updated successfully for tenant ${tenantId}`);
          }
        } else {
          console.log(`Payment ${paymentId} status is ${status}, not updating subscription.`);
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Always return 200 to MercadoPago to acknowledge receipt, even if processing fails
    res.status(200).send('OK');
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        proxy: {}
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
