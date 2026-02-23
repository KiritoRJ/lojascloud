import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN as string,
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

    res.status(200).json({
      id: response.id,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar preferência' });
  }
}