export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const TOKEN = process.env.AT_TOKEN;
  if (!TOKEN) {
    return res.status(500).json({ products: [], error: 'missing_token' });
  }

  const page  = req.query.page  || 1;
  const limit = req.query.limit || 50;
  const type  = req.query.type  || 'datafeed';   // 'datafeed' | 'top'

  const url = (type === 'top')
    ? 'https://api.accesstrade.vn/v1/top_products?merchant=shopee'
    : 'https://api.accesstrade.vn/v1/datafeeds?domain=shopee.vn&page=' + page + '&limit=' + limit;

  try {
    const r = await fetch(url, {
      headers: {
        'Authorization': 'Token ' + TOKEN,
        'Content-Type': 'application/json'
      }
    });
    const raw  = await r.json();
    const list = Array.isArray(raw.data) ? raw.data : [];
    const products = list.map(function (p) {
      return {
        title:    p.name,
        image:    p.image,
        link:     p.aff_link || p.url || p.link,  // aff_link đã gắn affiliate sẵn
        price:    p.price,
        discount: p.discount
      };
    });
    return res.status(200).json({ products: products, total: raw.total || products.length, upstream: r.status });
  } catch (e) {
    return res.status(502).json({ products: [], error: 'fetch_failed', message: String(e) });
  }
}
