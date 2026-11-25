// Sosyal medya hesapları: panelde "SEO & Ayarlar" bölümünden düzenlenir (ayar anahtarı sosyal_<ad>), site altında simge olarak görünür.
// Varsayılanlar HasTürk Mağaza'nın kendi hesaplarıdır; boş bırakılan hesap gösterilmez.
export const SOSYAL = [
  { k: 'instagram', ad: 'Instagram', url: 'https://www.instagram.com/hasturkgubre', svg: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3"/>' },
  { k: 'facebook', ad: 'Facebook', url: 'https://www.facebook.com/hasturkgubre', svg: '<path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21z"/>' },
  { k: 'youtube', ad: 'YouTube', url: 'https://www.youtube.com/@hasturkgubre', svg: '<path fill-rule="evenodd" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z"/>' },
  { k: 'tiktok', ad: 'TikTok', url: '', svg: '<path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v3.1c-1.4.1-2.6-.3-3.9-1.1v5.7c0 3.5-2.6 5.9-5.8 5.9a5.6 5.6 0 0 1-5.7-5.6c0-3.6 3.1-6.1 6.7-5.5v3.2c-1.6-.4-3.4.5-3.4 2.3 0 1.4 1.1 2.4 2.4 2.4 1.5 0 2.5-1 2.5-2.9V3z"/>' },
  { k: 'x', ad: 'X (Twitter)', url: 'https://x.com/hasturkgubre', svg: '<path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z"/>' },
  { k: 'linkedin', ad: 'LinkedIn', url: 'https://www.linkedin.com/company/hasturkgubre/', svg: '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z"/>' },
  { k: 'pinterest', ad: 'Pinterest', url: '', svg: '<path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.6 1.3 1.4 0 .9-.5 2.1-.8 3.3-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1-2.9 0-4.5 2.1-4.5 4.4 0 .9.3 1.8.8 2.3l.1.4-.3 1.1c0 .2-.2.2-.4.1-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1 0-2-.5-2.4-1.2l-.6 2.5c-.2.9-.9 2.1-1.3 2.8A10 10 0 1 0 12 2z"/>' },
];

// Ayarlarda dolu olan hesaplar (sırasıyla)
export const sosyalHesaplar = (A) => SOSYAL.map((s) => ({ ...s, link: String(A['sosyal_' + s.k] || '').trim() })).filter((s) => /^https:\/\//i.test(s.link));
