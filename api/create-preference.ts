import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, unit_price, quantity, tenantId, planType } = req.body;

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Mercado Pago access token not configured.' });
  }

  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
  
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
  const host = req.headers.host;
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

  try {
    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create({ body: preference });
    res.status(200).json({ id: response.id, init_point: response.init_point });
  } catch (error: any) {
    console.error('Error creating Mercado Pago preference:', error);

    // The MercadoPago SDK often wraps API errors in the 'cause' property.
    const apiErrorCause = error.cause;

    if (apiErrorCause && apiErrorCause.statusCode) {
      // This is a specific error from the Mercado Pago API.
      // We should use their status code and provide their error message to the client.
      // This prevents turning a 400 (Bad Request) into a 500 (Internal Server Error).
      const statusCode = apiErrorCause.statusCode;
      const errorMessage = apiErrorCause.message || 'An error occurred with the payment provider.';
      
      let errorDetails = {};
      try {
        // The message can be a JSON string, let's parse it for a cleaner response.
        errorDetails = JSON.parse(errorMessage);
      } catch (e) {
        errorDetails = { error: errorMessage };
      }

      return res.status(statusCode).json(errorDetails);
    }

    // This is an unexpected server-side error (e.g., configuration, network).
    const fallbackErrorMessage = error.message || 'Failed to create payment preference.';
    res.status(500).json({ error: fallbackErrorMessage, details: error.toString() });
  }
}
