export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const TOKEN = process.env.AT_TOKEN;
  if (!TOKEN) return res.status(500).json({ products: [], error: 'missing_token' });

  const page  = req.query.page  || 1;
  const limit = req.query.limit || 50;
  const type  = req.query.type  || 'datafeed';

  const url = (type === 'top')
    ? 'https://api.accesstrade.vn/v1/top_products?merchant=shopee'
    : 'https://api.accesstrade.vn/v1/datafeeds?domain=shopee.vn&page=' + page + '&limit=' + limit;

  try {
    const r = await fetch(url, {
      headers: { 'Authorization': 'Token ' + TOKEN, 'Content-Type': 'application/json' }
    });
    const raw  = await r.json();
    const list = Array.isArray(raw.data) ? raw.data : [];

    const products = list.map(function (p) {
      const price = Number(p.price) || 0;
      const disc  = Number(p.discount) || 0;
      let   rate  = Number(p.discount_rate) || 0;

      // Tính giá sau giảm hợp lý (lọc giá trị vô lý kiểu "25đ")
      let final = price;
      if (disc > 0 && disc < price && disc >= price * 0.1) {
        final = disc;
      } else if (rate > 0 && rate < 100) {
        final = Math.round(price * (1 - rate / 100));
      }
      if (!rate && price > 0 && final < price) {
        rate = Math.round((1 - final / price) * 100);
      }

      return {
        title: p.name,
        image: p.image,
        link:  p.aff_link || p.url || p.link,
        price: price,
        final: final,
        rate:  (final < price ? rate : 0)
      };
    });

    return res.status(200).json({ products: products, total: raw.total || products.length, upstream: r.status });
  } catch (e) {
    return res.status(502).json({ products: [], error: 'fetch_failed', message: String(e) });
  }
}
