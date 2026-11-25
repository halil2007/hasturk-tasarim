// blog.hasturkgubre.com.tr için Cloudflare Pages giriş noktası.
// Alan adının DNS'i Turhost'ta kalır; Turhost'ta yalnız "blog" CNAME kaydı Pages'e yönlenir.
// Gelen her istek, "BLOG" service binding'i ile hasturk-arama Worker'ına aynen iletilir (blog kodu: src/blog/).
export default {
  fetch(req, env) {
    if (!env.BLOG) return new Response('BLOG service binding tanımlı değil (Pages > Settings > Bindings)', { status: 503 });
    return env.BLOG.fetch(req);
  },
};
