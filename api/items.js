export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const TOKEN = process.env.AT_TOKEN;
  if (!TOKEN) return res.status(500).json({ items: [], error: 'missing_token' });

  const page   = req.query.page  || 1;
  const limit  = req.query.limit || 50;
  const SHOPEE = '4742147753565840242'; // UID nhà cung cấp Shopee

  const url = 'https://api.accesstrade.vn/v1/offers_informations/coupon?merchant=' + SHOPEE + '&page=' + page + '&limit=' + limit;

  try {
    const r = await fetch(url, {
      headers: { 'Authorization': 'Token ' + TOKEN, 'Content-Type': 'application/json' }
    });
    const raw  = await r.json();
    // Lưu ý: endpoint này trả về dạng { data: { data: [...] } }
    const list = (raw && raw.data && Array.isArray(raw.data.data)) ? raw.data.data : [];

    const items = list.map(function (c) {
      const cp = (c.coupons && c.coupons[0]) ? c.coupons[0] : {};
      return {
        name:        c.name || '',
        content:     c.content || '',
        image:       c.image || '',
        code:        cp.coupon_code || '',
        codeDesc:    cp.coupon_desc || '',
        link:        c.prod_link || c.link || '',   // prod_link = link affiliate
        discountValue: Number(c.discount_value) || 0,
        discountPct:   Number(c.discount_percentage) || 0,
        minSpend:    Number(c.min_spend) || 0,
        timeLeft:    c.time_left || '',
        isHot:       String(c.is_hot) === 'True',
        status:      c.status
      };
    })
    .filter(function (c) { return c.status === 1 || c.status === undefined; }) // còn hiệu lực
    .sort(function (a, b) { return (b.isHot ? 1 : 0) - (a.isHot ? 1 : 0); });   // mã hot lên đầu

    return res.status(200).json({ items: items, total: (raw.data && raw.data.count) || items.length, upstream: r.status });
  } catch (e) {
    return res.status(502).json({ items: [], error: 'fetch_failed', message: String(e) });
  }
}
