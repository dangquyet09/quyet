export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const TOKEN = process.env.AT_TOKEN;
  if (!TOKEN) return res.status(500).json({ items: [], error: 'missing_token' });

  const H = { 'Authorization': 'Token ' + TOKEN, 'Content-Type': 'application/json' };

  // ===== Chế độ chẩn đoán: mở ?src=diag =====
  if (req.query.src === 'diag') {
    const tests = {
      datafeed:   'https://api.accesstrade.vn/v1/datafeeds?domain=shopee.vn&limit=2',
      campaigns:  'https://api.accesstrade.vn/v1/campaigns?limit=2',
      coupon_hot: 'https://api.accesstrade.vn/v1/offers_informations/coupon_hot?date=1&limit=2',
      coupon:     'https://api.accesstrade.vn/v1/offers_informations/coupon?limit=2'
    };
    const report = {};
    await Promise.all(Object.keys(tests).map(async function (k) {
      try {
        const r = await fetch(tests[k], { headers: H });
        const text = await r.text();
        report[k] = { status: r.status, body: text.slice(0, 200) };
      } catch (e) {
        report[k] = { status: 'fetch_failed', body: String(e) };
      }
    }));
    return res.status(200).json({ token_tail: TOKEN.slice(-4), report });
  }

  // ===== Bình thường: lấy mã giảm giá =====
  const page  = req.query.page  || 1;
  const limit = req.query.limit || 50;
  const url = 'https://api.accesstrade.vn/v1/offers_informations/coupon_hot?date=1&limit=' + limit;

  try {
    const r = await fetch(url, { headers: H });
    const raw = await r.json();
    let list = [];
    if (raw && raw.data && Array.isArray(raw.data.data)) list = raw.data.data;
    else if (raw && Array.isArray(raw.data)) list = raw.data;

    const items = list.map(function (c) {
      const cp = (c.coupons && c.coupons[0]) ? c.coupons[0] : {};
      return {
        name: c.name || '', content: c.content || '', image: c.image || '',
        code: cp.coupon_code || '', link: c.prod_link || c.link || '',
        discountValue: Number(c.discount_value) || 0, discountPct: Number(c.discount_percentage) || 0,
        minSpend: Number(c.min_spend) || 0, timeLeft: c.time_left || '', isHot: String(c.is_hot) === 'True'
      };
    });
    return res.status(200).json({ items: items, upstream: r.status });
  } catch (e) {
    return res.status(502).json({ items: [], error: 'fetch_failed', message: String(e) });
  }
}
