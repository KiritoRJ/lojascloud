import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(500).json({
        error: 'MERCADO_PAGO_ACCESS_TOKEN não definida'
      });
    }

    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    });

    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: [
          {
            title: 'Produto Teste',
            quantity: 1,
            unit_price: 100,
          },
        ],
      },
    });

    return res.status(200).json({
      id: response.id,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}