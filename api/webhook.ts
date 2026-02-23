import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lawcmqsjhwuhogsukhbf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_c2wQfanSj96FRWqoCq9KIw_2FhxuRBv';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

        if (!data) {
          console.error(`Payment with ID ${paymentId} not found.`);
          return res.status(200).send('OK'); // Acknowledge webhook, but stop processing
        }

        const externalReference = data.external_reference;
        const status = data.status;

        if (externalReference && status === 'approved') {
          const [tenantId, planType] = externalReference.split('|');
          const plans = {
            monthly: 1,
            quarterly: 3,
            yearly: 12
          };

          const months = plans[planType as keyof typeof plans];

          if (months) {
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + months);

            const { error } = await supabase
              .from('tenants')
              .update({
                subscription_status: 'active',
                subscription_expires_at: expiresAt.toISOString(),
                last_plan_type: planType
              })
              .eq('id', tenantId);

            if (error) {
              console.error('Error updating subscription in Supabase:', error);
            } else {
              console.log(`Subscription updated successfully for tenant ${tenantId}`);
            }
          }
        } else {
          console.log(`Payment ${paymentId} status is ${status}, not updating subscription.`);
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(200).send('OK');
  }
}
