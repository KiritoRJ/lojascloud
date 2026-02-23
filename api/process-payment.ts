import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { formData, tenantId, planType } = req.body;

    console.log('MERCADO_PAGO_ACCESS_TOKEN:', process.env.MERCADO_PAGO_ACCESS_TOKEN ? 'Configured' : 'Not Configured');

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Mercado Pago access token not configured.' });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
    const paymentClient = new Payment(client);

    const paymentData: any = {
      transaction_amount: formData.transaction_amount,
      description: formData.description || `Assinatura ${planType}`,
      payment_method_id: formData.payment_method_id,
      payer: {
        email: formData.payer.email,
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
    // Ensure a valid JSON error response is always sent
    const errorMessage = error.message || 'Failed to process payment';
    const errorDetails = error.cause || error;
    res.status(500).json({ error: errorMessage, details: errorDetails });
  }
}
