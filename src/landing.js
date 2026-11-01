// What search engines see: the quick-race tool under one address per everyday use (calling a pupil to the
// board, splitting teams, ordering presentations, picking a name on a livestream), each with its own title,
// intro and how-to; plus the head tags of every public page, robots.txt and sitemap.xml.
// Wording rule (CLAUDE.md): random / ngẫu nhiên / chọn tên, never prize or luck vocabulary.

export const SITE_NAME = 'Đua Vịt Peti';

/** The quick race under every address it answers to. `teams` adds the team split to the results. */
export const TOOL_PAGES = [
  {
    path: '/dua-nhanh',
    title: 'Chọn tên ngẫu nhiên bằng cuộc đua · Đua Vịt Peti',
    description: 'Dán danh sách tên, bấm đua, người về nhất là tên được chọn. Random tên miễn phí, không cần đăng nhập, kết quả kiểm chứng được.',
    h1: 'Chọn tên ngẫu nhiên',
    intro: 'Dán danh sách tên (mỗi dòng một tên), bấm đua. Thứ tự về đích là kết quả random. Chạy hoàn toàn trên trình duyệt, không cần tài khoản.',
    placeholder: 'VD: Random thứ tự thuyết trình',
    sections: [
      ['Cách dùng', [
        'Dán danh sách tên vào ô bên trên, hoặc nhập file CSV/TXT. Tối đa 500 tên; tên trùng được đánh số.',
        'Chọn map và thời lượng, bấm "Bắt đầu đua". Mỗi tên là một nhân vật trên đường đua.',
        'Hết cuộc đua, bảng kết quả xếp đủ thứ tự từ người về nhất tới người về cuối. Có thể sao chép, tải CSV hoặc tải video cuộc đua.',
      ]],
      ['Vì sao kết quả công bằng', [
        'Tốc độ của từng nhân vật lấy từ một seed ngẫu nhiên. Trước khi đua, trang công bố mã cam kết (SHA-256 của seed); sau khi đua mới công bố seed. Ai cũng chạy lại được cuộc đua từ seed đó và ra đúng kết quả, nên không ai chỉnh được kết quả sau khi đã thấy danh sách.',
        'Phụ kiện, ném đồ, ngã: chỉ là hình ảnh, không ảnh hưởng thứ tự về đích.',
      ]],
    ],
  },
  {
    path: '/goi-hoc-sinh-len-bang',
    title: 'Gọi học sinh lên bảng ngẫu nhiên · Đua Vịt Peti',
    description: 'Dán danh sách lớp, bấm đua, em về nhất lên bảng. Gọi tên học sinh ngẫu nhiên trên máy chiếu, cả lớp cùng xem, không ai nói thầy cô thiên vị.',
    h1: 'Gọi học sinh lên bảng ngẫu nhiên',
    intro: 'Dán danh sách lớp, bấm đua trên máy chiếu. Em về nhất lên bảng; cần gọi thêm thì lấy tiếp em về nhì, về ba.',
    placeholder: 'VD: Gọi lên bảng · Lớp 7A',
    sections: [
      ['Dùng trong lớp', [
        'Dán danh sách lớp một lần: trang nhớ danh sách trên máy này cho lần sau.',
        'Chọn thời lượng ngắn (15–30 giây) để không mất giờ học. Bật toàn màn hình để cả lớp cùng xem trên máy chiếu hoặc tivi.',
        'Cần gọi nhiều em (kiểm tra miệng, chữa bài): dùng luôn thứ tự về đích, không phải đua lại.',
      ]],
      ['Vì sao học sinh tin kết quả', [
        'Cả lớp thấy cuộc đua diễn ra, và kết quả kiểm chứng được: trang công bố mã cam kết trước khi đua, seed sau khi đua. Thầy cô không chọn được ai lên bảng.',
      ]],
    ],
  },
  {
    path: '/chia-doi-ngau-nhien',
    title: 'Chia đội ngẫu nhiên từ danh sách tên · Đua Vịt Peti',
    description: 'Dán danh sách người, chọn số đội, bấm đua. Chia đội random theo thứ tự về đích, kết quả công bằng và kiểm chứng được.',
    h1: 'Chia đội ngẫu nhiên',
    intro: 'Dán danh sách người, chọn số đội, bấm đua. Hết cuộc đua, mọi người được chia đều vào các đội theo thứ tự về đích.',
    placeholder: 'VD: Chia đội đá bóng chiều thứ Bảy',
    teams: true,
    sections: [
      ['Cách chia', [
        'Người về nhất vào đội 1, về nhì vào đội 2… lần lượt vòng lại, nên các đội chênh nhau nhiều nhất một người.',
        'Dùng cho chia nhóm làm bài, chia đội thể thao, chia bàn trong buổi liên hoan, chia ca trực.',
      ]],
      ['Vì sao công bằng', [
        'Thứ tự về đích đến từ một seed ngẫu nhiên đã cam kết trước khi đua, nên không ai xếp được người mình muốn vào cùng đội.',
      ]],
    ],
  },
  {
    path: '/xep-thu-tu-ngau-nhien',
    title: 'Xếp thứ tự ngẫu nhiên (random thứ tự) · Đua Vịt Peti',
    description: 'Dán danh sách, bấm đua, nhận thứ tự random đầy đủ: thứ tự thuyết trình, thứ tự thi, thứ tự trực nhật. Tải về CSV.',
    h1: 'Xếp thứ tự ngẫu nhiên',
    intro: 'Dán danh sách, bấm đua. Thứ tự về đích là thứ tự random của cả danh sách, từ người đầu tiên tới người cuối cùng.',
    placeholder: 'VD: Thứ tự thuyết trình nhóm',
    sections: [
      ['Dùng khi nào', [
        'Thứ tự thuyết trình, thứ tự lên thi, thứ tự trực nhật, thứ tự phát biểu trong cuộc họp.',
        'Kết quả sao chép được thành danh sách đánh số, hoặc tải file CSV để dán vào bảng tính.',
      ]],
      ['Vì sao không ai cãi', [
        'Mọi người cùng xem cuộc đua, và kết quả kiểm chứng được bằng seed công bố sau khi đua.',
      ]],
    ],
  },
  {
    path: '/random-ten-livestream',
    title: 'Random tên trên livestream · Đua Vịt Peti',
    description: 'Chọn tên ngẫu nhiên ngay trên livestream: dán danh sách người bình luận, bấm đua, cả phòng cùng xem. Có kết quả kiểm chứng được và video để đăng lại.',
    h1: 'Random tên trên livestream',
    intro: 'Dán danh sách tên (người bình luận, người đăng ký), bấm đua ngay trên sóng. Người xem thấy cuộc đua từ đầu tới cuối, kết quả kiểm chứng được.',
    placeholder: 'VD: Random tên người bình luận',
    sections: [
      ['Lên sóng', [
        'Chia sẻ màn hình hoặc cửa sổ trình duyệt vào phần mềm livestream (OBS, Streamlabs…). Bật toàn màn hình cho gọn.',
        'Muốn người xem tự bấm điện thoại để chạy nhân vật của mình: tạo phòng ở trang chủ và gắn trang /live của phòng vào OBS.',
        'Bật "Quay video cuộc đua" để có file đăng lại sau buổi live.',
      ]],
      ['Người xem tin kết quả', [
        'Mã cam kết hiện trên màn hình trước khi đua; seed công bố sau khi đua. Ai nghi ngờ thì mở trang Kiểm chứng, dán seed và xem lại đúng cuộc đua đó.',
      ]],
    ],
  },
  {
    path: '/vong-quay-ngau-nhien',
    title: 'Thay vòng quay ngẫu nhiên bằng cuộc đua · Đua Vịt Peti',
    description: 'Vòng quay random chỉ ra một tên mỗi lần quay. Cuộc đua xếp đủ thứ tự cả danh sách trong một lần, tới 500 tên, kết quả kiểm chứng được.',
    h1: 'Vòng quay ngẫu nhiên hay cuộc đua?',
    intro: 'Vòng quay ra một tên mỗi lần quay. Cuộc đua xếp đủ thứ tự cả danh sách trong một lần chạy, nên chọn một người hay xếp cả lớp đều xong trong một lượt.',
    placeholder: 'VD: Random tên',
    sections: [
      ['Khác nhau ở đâu', [
        'Nhiều tên: vòng quay khó đọc khi có vài chục tên trở lên; đường đua chạy được tới 500 tên, bảng xếp hạng trực tiếp hiện top 10.',
        'Một lần đua cho cả thứ tự: cần chọn 3 người hay xếp thứ tự 40 người đều không phải quay lại nhiều lần.',
        'Kiểm chứng được: kết quả đến từ seed đã cam kết trước khi đua, ai cũng chạy lại được.',
        'Vòng quay vẫn gọn hơn khi chỉ có vài tên và cần kết quả trong 3 giây.',
      ]],
    ],
  },
];

/** Pages without the tool that search engines should still know about. */
export const OTHER_PAGES = [
  { path: '/', title: 'Đua Vịt Peti · Chọn tên ngẫu nhiên bằng cuộc đua', description: 'Random tên bằng cuộc đua nhân vật: dán danh sách để chọn ngẫu nhiên, hoặc tạo phòng cho cả phòng bấm điện thoại để chạy. Miễn phí, kết quả kiểm chứng được.' },
  { path: '/cong-bang', title: 'Thuật toán ngẫu nhiên công bằng · Đua Vịt Peti', description: 'Cách Đua Vịt Peti đảm bảo kết quả ngẫu nhiên: mã cam kết SHA-256, seed công bố sau khi đua, ai cũng chạy lại được.' },
  { path: '/kiem-chung', title: 'Kiểm chứng kết quả cuộc đua · Đua Vịt Peti', description: 'Dán seed và danh sách để chạy lại một cuộc đua và xem đúng kết quả đã công bố.' },
  { path: '/dieu-khoan', title: 'Điều khoản sử dụng · Đua Vịt Peti', description: 'Điều khoản sử dụng Đua Vịt Peti.' },
  { path: '/quyen-rieng-tu', title: 'Quyền riêng tư · Đua Vịt Peti', description: 'Đua Vịt Peti lưu những gì và vì sao.' },
];

const ALL_PAGES = [...OTHER_PAGES, ...TOOL_PAGES];
export const findPage = (path) => ALL_PAGES.find((p) => p.path === path) ?? null;

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Title, description, canonical, share tags and structured data for one page. */
export function headTags(base, page) {
  const url = `${base}${page.path}`;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: page.h1 ? `${page.h1} · ${SITE_NAME}` : SITE_NAME,
    url,
    description: page.description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    inLanguage: 'vi',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND' },
  };
  return [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    '<meta property="og:locale" content="vi_VN">',
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:title" content="${escapeHtml(page.title)}">`,
    `<meta property="og:description" content="${escapeHtml(page.description)}">`,
    `<meta property="og:image" content="${escapeHtml(`${base}/og.png`)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">',
    // JSON in a data block is never run as script (the CSP stays script-src 'self'); "<" is escaped so it cannot close the tag
    `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`,
  ].join('\n  ');
}

const related = (page) => TOOL_PAGES.filter((p) => p.path !== page.path)
  .map((p) => `<li><a href="${p.path}">${escapeHtml(p.h1)}</a></li>`).join('');

/** The quick-race page for one use: its head, intro and how-to, the right placeholder, the team split. */
export function renderTool(template, base, page) {
  const intro = `<section class="seo-intro"><h1>${escapeHtml(page.h1)}</h1><p>${escapeHtml(page.intro)}</p></section>`;
  const body = [
    '<article class="seo-body">',
    ...page.sections.map(([heading, paragraphs]) => `<section><h2>${escapeHtml(heading)}</h2>${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}</section>`),
    `<nav aria-label="Dùng cho việc khác"><h2>Dùng cho việc khác</h2><ul>${related(page)}</ul></nav>`,
    '</article>',
  ].join('');
  const teams = page.teams
    ? '<label class="field">Số đội <input id="teams" type="number" min="2" max="20" value="2" inputmode="numeric"></label>'
    : '';
  return fill(template, {
    '<!--seo:head-->': headTags(base, page),
    '<!--seo:intro-->': intro,
    '<!--seo:body-->': body,
    '<!--seo:teams-->': teams,
    'placeholder="VD: Random thứ tự thuyết trình"': `placeholder="${escapeHtml(page.placeholder)}"`,
  });
}

/** A page without the tool: only its head tags. */
export const renderPage = (template, base, page) => fill(template, { '<!--seo:head-->': headTags(base, page) });

function fill(template, parts) {
  let html = template;
  for (const [marker, value] of Object.entries(parts)) {
    if (html.split(marker).length !== 2) throw new Error(`landing: marker ${marker} must appear exactly once`);
    html = html.replace(marker, () => value);
  }
  return html;
}

export const robotsTxt = (base) => [
  'User-agent: *',
  'Disallow: /r/',
  'Disallow: /admin',
  'Disallow: /api/',
  '',
  `Sitemap: ${base}/sitemap.xml`,
  '',
].join('\n');

export const sitemapXml = (base) => [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...ALL_PAGES.map((p) => `  <url><loc>${escapeHtml(`${base}${p.path}`)}</loc></url>`),
  '</urlset>',
  '',
].join('\n');
