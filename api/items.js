export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const TOKEN = process.env.AT_TOKEN;
  if (!TOKEN) return res.status(500).json({ products: [], error: 'missing_token' });

  const AFF_ID = '17310760448';            // 👈 ID Shopee Affiliate của BẠN
  const SUB    = 'sansale';
  const page   = req.query.page  || 1;
  const limit  = req.query.limit || 100;
  const MIN    = Number(req.query.min) || 0; // ngưỡng % giảm tối thiểu (mặc định 0)

  const url = 'https://api.accesstrade.vn/v1/datafeeds?domain=shopee.vn&page=' + page + '&limit=' + limit;

  // Bóc link gốc Shopee từ dữ liệu datafeed
  function rawShopeeUrl(p) {
    if (p.url && p.url.indexOf('shopee') >= 0) return p.url;
    const m = (p.aff_link || '').match(/[?&]url=([^&]+)/);
    if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
    return p.url || '';
  }
  // Tạo link affiliate bằng ID của bạn
  function myAff(shopeeUrl) {
    return 'https://s.shopee.vn/an_redir?origin_link=' + encodeURIComponent(shopeeUrl)
      + '&affiliate_id=' + AFF_ID + '&sub_id=' + SUB;
  }

  try {
    const r = await fetch(url, { headers: { 'Authorization': 'Token ' + TOKEN, 'Content-Type': 'application/json' } });
    const raw = await r.json();
    const list = Array.isArray(raw.data) ? raw.data : [];

    const products = list.map(function (p) {
      const price = Number(p.price) || 0;
      const disc  = Number(p.discount) || 0;
      let   rate  = Number(p.discount_rate) || 0;
      let final = price;
      if (disc > 0 && disc < price && disc >= price * 0.1) final = disc;
      else if (rate > 0 && rate < 100) final = Math.round(price * (1 - rate / 100));
      if (!rate && price > 0 && final < price) rate = Math.round((1 - final / price) * 100);

      return {
        title: p.name,
        image: p.image,
        link:  myAff(rawShopeeUrl(p)),   // 👈 link của CHÍNH BẠN
        price: price,
        final: final,
        rate:  (final < price ? rate : 0)
      };
    })
    .filter(function (p) { return p.rate >= MIN; })
    .sort(function (a, b) { return b.rate - a.rate; });   // giảm nhiều nhất lên đầu

    return res.status(200).json({ products: products, total: products.length, upstream: r.status });
  } catch (e) {
    return res.status(502).json({ products: [], error: 'fetch_failed', message: String(e) });
  }
}
