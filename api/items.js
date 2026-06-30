export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const TOKEN = process.env.AT_TOKEN;
  if (!TOKEN) return res.status(500).json({ items: [], error: 'missing_token' });

  const page  = req.query.page  || 1;
  const limit = req.query.limit || 50;
  const src   = req.query.src   || 'hot';   // 'hot' = coupon_hot | 'coupon' = full list

  const url = (src === 'coupon')
    ? 'https://api.accesstrade.vn/v1/offers_informations/coupon?page=' + page + '&limit=' + limit
    : 'https://api.accesstrade.vn/v1/offers_informations/coupon_hot?date=1&limit=' + limit;

  try {
    const r = await fetch(url, {
      headers: { 'Authorization': 'Token ' + TOKEN, 'Content-Type': 'application/json' }
    });
    const raw = await r.json();

    // Bắt mọi kiểu shape có thể
    let list = [];
    if (raw && raw.data && Array.isArray(raw.data.data)) list = raw.data.data;
    else if (raw && Array.isArray(raw.data)) list = raw.data;
    else if (Array.isArray(raw)) list = raw;

    const items = list.map(function (c) {
      const cp = (c.coupons && c.coupons[0]) ? c.coupons[0] : {};
      return {
        name: c.name || '',
        content: c.content || '',
        image: c.image || '',
        code: cp.coupon_code || '',
        link: c.prod_link || c.link || '',
        discountValue: Number(c.discount_value) || 0,
        discountPct: Number(c.discount_percentage) || 0,
        minSpend: Number(c.min_spend) || 0,
        timeLeft: c.time_left || '',
        isHot: String(c.is_hot) === 'True'
      };
    });

    const out = { items: items, upstream: r.status, src: src };
    if (!items.length) {
      out.debug = {
        success: raw ? raw.success : null,
        topKeys: raw ? Object.keys(raw) : [],
        dataType: (raw && raw.data) ? (Array.isArray(raw.data) ? 'array' : typeof raw.data) : 'none',
        sample: JSON.stringify(raw).slice(0, 1000)   // 👈 cho mình xem AccessTrade trả gì
      };
    }
    return res.status(200).json(out);
  } catch (e) {
    return res.status(502).json({ items: [], error: 'fetch_failed', message: String(e) });
  }
}
