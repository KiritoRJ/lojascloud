import { MercadoPagoConfig, Payment } from 'mercadopago';
import { OnlineDB } from '../utils/api';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const payment = req.body;

    if (payment?.type === 'payment' || payment?.action === 'payment.updated') {
      const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' });
      const paymentClient = new Payment(client);
      
      const paymentId = payment?.data?.id || payment?.id;

      if (paymentId) {
        const data = await paymentClient.get({ id: paymentId });
        const externalReference = data.external_reference;

        if (externalReference) {
          const [tenantId, planType] = externalReference.split('|');
          const plans = {
            monthly: 1,
            quarterly: 3,
            yearly: 12
          };

          const months = plans[planType as keyof typeof plans];

          if (months) {
            await OnlineDB.updateSubscription(tenantId, months, planType as any);
          }
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(200).send('OK');
  }
}
