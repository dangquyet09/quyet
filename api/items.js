export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const AFF_ID = '17310760448';
  const SUB    = 'flashsale';
  const limit  = Number(req.query.limit) || 50;

  const H = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'x-api-source': 'pc',
    'x-shopee-language': 'vi',
    'Referer': 'https://shopee.vn/flash_sale',
    'Content-Type': 'application/json'
  };

  const img   = function (h) { return h ? ('https://cf.shopee.vn/file/' + h) : ''; };
  const myAff = function (u) { return 'https://s.shopee.vn/an_redir?origin_link=' + encodeURIComponent(u) + '&affiliate_id=' + AFF_ID + '&sub_id=' + SUB; };

  try {
    // 1) Lấy danh sách khung giờ flash sale
    const sRes = await fetch('https://shopee.vn/api/v4/flash_sale/get_all_sessions?category_personalization_type=0', { headers: H });
    if (!sRes.ok) return res.status(200).json({ products: [], error: 'sessions_blocked', upstream: sRes.status });
    const sJson = await sRes.json();
    const sessions = (sJson.data && sJson.data.sessions) || [];
    if (!sessions.length) return res.status(200).json({ products: [], error: 'no_sessions', topKeys: Object.keys(sJson || {}), sample: JSON.stringify(sJson).slice(0, 300) });

    // Chọn khung ĐANG diễn ra, không có thì lấy khung đầu danh sách
    const now = Math.floor(Date.now() / 1000);
    const session = sessions.find(function (s) { return s.start_time <= now && now < s.end_time; }) || sessions[0];
    const promoId = session.promotionid;

    // 2) Lấy sản phẩm trong khung đó
    const iRes = await fetch('https://shopee.vn/api/v4/flash_sale/flash_sale_batch_get_items', {
      method: 'POST', headers: H,
      body: JSON.stringify({ promotionid: promoId, limit: limit, offset: 0, with_dp_items: true })
    });
    if (!iRes.ok) return res.status(200).json({ products: [], error: 'items_blocked', upstream: iRes.status, promoId: promoId });
    const iJson = await iRes.json();
    const items = (iJson.data && iJson.data.items) || [];

    const products = items.map(function (it) {
      const price = (Number(it.price_before_discount) || 0) / 100000;  // giá Shopee ×100000
      const final = (Number(it.price) || 0) / 100000;
      const rate  = Number(it.raw_discount) || (price > 0 ? Math.round((1 - final / price) * 100) : 0);
      const url   = 'https://shopee.vn/product/' + it.shopid + '/' + it.itemid;
      return {
        title: it.name,
        image: img(it.image),
        link:  myAff(url),                 // 👈 link ID của BẠN
        price: Math.round(price),
        final: Math.round(final),
        rate:  rate,
        stock: it.stock,
        sold:  it.sold
      };
    }).sort(function (a, b) { return b.rate - a.rate; });

    return res.status(200).json({ products: products, total: products.length, promoId: promoId });
  } catch (e) {
    return res.status(200).json({ products: [], error: 'fetch_failed', message: String(e) });
  }
}
