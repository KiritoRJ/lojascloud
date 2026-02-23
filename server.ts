import express from 'express';
import { createServer as createViteServer } from 'vite';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import dotenv from 'dotenv';
import cors from 'cors';
import { OnlineDB } from './utils/api';

dotenv.config();

const app = express();
const PORT = 3000;

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.post('/api/process-payment', async (req, res) => {
  console.log('Request received at /api/process-payment');
  try {
    const { formData, tenantId, planType } = req.body;

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Mercado Pago access token not configured.' });
    }

    const paymentClient = new Payment(client);

    const planDetails = {
      monthly: { title: 'Assinatura Mensal', description: 'Acesso por 1 mês' },
      quarterly: { title: 'Assinatura Trimestral', description: 'Acesso por 3 meses' },
      yearly: { title: 'Assinatura Anual', description: 'Acesso por 12 meses' },
    };

    const paymentData: any = {
      transaction_amount: formData.transaction_amount,
      description: planDetails[planType as keyof typeof planDetails]?.title || `Assinatura ${planType}`,
      payment_method_id: formData.payment_method_id,
      statement_descriptor: 'ASSISTPRO',
      payer: {
        email: formData.payment_method_id === 'pix' ? 'test_user_46945293@testuser.com' : formData.payer.email,
        ...(formData.payer.first_name && { first_name: formData.payer.first_name }),
        ...(formData.payer.last_name && { last_name: formData.payer.last_name }),
        ...(formData.payer.identification && { identification: formData.payer.identification }),
      },
      external_reference: `${tenantId}|${planType}`
    };

    if (formData.token) paymentData.token = formData.token;
    if (formData.installments) paymentData.installments = formData.installments;
    if (formData.issuer_id) paymentData.issuer_id = formData.issuer_id;

    const response = await paymentClient.create({ body: paymentData });
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error processing payment:', error);
    const errorMessage = error.message || 'Failed to process payment';
    const errorDetails = error.cause || error;
    res.status(500).json({ error: errorMessage, details: errorDetails });
  }
});

app.post(['/api/webhook', '/api/webhook/'], async (req, res) => {
  try {
    const payment = req.body;

    if (payment?.type === 'payment' || payment?.action === 'payment.updated') {
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
