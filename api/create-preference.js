import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, unit_price, quantity, tenantId, planType } = req.body;

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'MERCADO_PAGO_ACCESS_TOKEN não configurado no Vercel.' });
    }

    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    });

    const preferenceClient = new Preference(client);

    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const response = await preferenceClient.create({
      body: {
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
        auto_return: 'approved',
        external_reference: `${tenantId}|${planType}`
      },
    });

    return res.status(200).json({
      id: response.id,
      init_point: response.init_point
    });

  } catch (error) {
    console.error('Erro Mercado Pago:', error);
    return res.status(500).json({
      error: error.message || 'Erro ao criar preferência de pagamento'
    });
  }
}