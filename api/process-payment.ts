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
        email: formData.payer.email,
        ...(formData.payer.first_name && { first_name: formData.payer.first_name }),
        ...(formData.payer.last_name && { last_name: formData.payer.last_name }),
        ...(formData.payer.identification && { identification: formData.payer.identification }),
      },
      items: [
        {
          id: planType,
          title: planDetails[planType as keyof typeof planDetails]?.title,
          description: planDetails[planType as keyof typeof planDetails]?.description,
          quantity: 1,
          unit_price: formData.transaction_amount,
          category_id: 'services', // Generic category for services
        }
      ],
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
