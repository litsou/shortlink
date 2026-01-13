export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 處理 API 請求：建立短網址
    if (path === "/api/create" && request.method === "POST") {
      try {
        const { longUrl, customSlug } = await request.json();
        
        if (!longUrl || !longUrl.startsWith('http')) {
          return new Response(JSON.stringify({ error: '請提供有效的網址 (需包含 http/https)' }), { status: 400 });
        }

        const slug = customSlug || Math.random().toString(36).substring(2, 8);
        
        if (customSlug) {
          const existing = await env.SHORT_LINKS.get(slug);
          if (existing) return new Response(JSON.stringify({ error: '此自定義名稱已被使用' }), { status: 400 });
        }

        await env.SHORT_LINKS.put(slug, longUrl);

        return new Response(JSON.stringify({ slug, shortUrl: `${url.origin}/${slug}` }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: '伺服器錯誤' }), { status: 500 });
      }
    }

    // 處理短網址跳轉
    if (path !== "/" && path !== "/api/create") {
      const slug = path.split('/')[1];
      const targetUrl = await env.SHORT_LINKS.get(slug);

      if (targetUrl) {
        return Response.redirect(targetUrl, 302);
      } else {
        return new Response("找不到該網址", { status: 404 });
      }
    }

    // 返回管理介面
    return new Response(this.getHTML(), {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' }
    });
  },

  getHTML() {
    return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>縮短網址 | by.litsou</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔗</text></svg>">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .glass { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.5); }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full glass p-8 rounded-3xl shadow-2xl">
        <div class="text-center mb-8">
            <div class="bg-indigo-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <i class="fa-solid fa-link text-2xl"></i>
            </div>
            <h1 class="text-3xl font-extrabold text-gray-800 tracking-tight">縮短網址</h1>
            <p class="text-gray-500 text-sm mt-2 font-medium">by.litsou</p>
        </div>

        <div class="space-y-5">
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">原始長網址</label>
                <input type="url" id="longUrl" placeholder="https://example.com/very-long-link" 
                    class="w-full px-4 py-3.5 rounded-2xl border border-gray-100 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all">
            </div>

            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">自定義名稱 (選填)</label>
                <input type="text" id="customSlug" placeholder="我的專屬連結" 
                    class="w-full px-4 py-3.5 rounded-2xl border border-gray-100 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all">
            </div>

            <button onclick="shorten()" id="btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2">
                <span id="btnText">立即縮短</span>
            </button>
        </div>

        <div id="result" class="mt-8 hidden">
            <div class="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <label class="block text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">您的短網址已就緒</label>
                <div class="flex items-center gap-3">
                    <input type="text" id="shortUrl" readonly class="bg-transparent w-full text-indigo-900 font-bold text-lg focus:outline-none">
                    <button onclick="copyLink()" class="bg-white p-2.5 rounded-xl shadow-sm text-indigo-600">
                        <i id="copyIcon" class="fa-regular fa-copy"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <div id="error" class="mt-4 hidden text-red-500 text-sm text-center font-medium"></div>
    </div>

    <script>
        async function shorten() {
            const longUrl = document.getElementById('longUrl').value;
            const customSlug = document.getElementById('customSlug').value;
            const btn = document.getElementById('btn');
            const btnText = document.getElementById('btnText');
            const resultDiv = document.getElementById('result');
            const errorDiv = document.getElementById('error');

            if(!longUrl) return;

            btn.disabled = true;
            btnText.innerText = "處理中...";
            errorDiv.classList.add('hidden');
            resultDiv.classList.add('hidden');

            try {
                const response = await fetch('/api/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ longUrl, customSlug })
                });
                const data = await response.json();
                if (response.ok) {
                    document.getElementById('shortUrl').value = data.shortUrl;
                    resultDiv.classList.remove('hidden');
                } else {
                    errorDiv.innerText = data.error;
                    errorDiv.classList.remove('hidden');
                }
            } catch (err) {
                errorDiv.innerText = "伺服器通訊錯誤";
                errorDiv.classList.remove('hidden');
            } finally {
                btn.disabled = false;
                btnText.innerText = "立即縮短";
            }
        }

        function copyLink() {
            const copyText = document.getElementById("shortUrl");
            copyText.select();
            document.execCommand("copy");
            const icon = document.getElementById('copyIcon');
            icon.classList.replace('fa-regular', 'fa-check');
            setTimeout(() => icon.classList.replace('fa-check', 'fa-regular'), 2000);
        }
    </script>
</body>
</html>
    `;
  }
};