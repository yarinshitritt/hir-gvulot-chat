export async function onRequest(context) {
    const { env } = context;
    const kv = env.CHAT_KV;
  
    try {
      let html = '<html dir="rtl" lang="he"><head><meta charset="utf-8"><title>קבצים שמורים</title><style>body{font-family:sans-serif; padding:20px;}</style></head><body><h1>הקבצים השמורים במסד הנתונים</h1>';
      
      const list = await kv.list({ prefix: "file:" });
      
      if (list.keys.length === 0) {
        html += '<p>אין קבצים שמורים כרגע.</p>';
      }
      
      for (const key of list.keys) {
        const fileContent = await kv.get(key.name);
        html += `<h2>${key.name}</h2>`;
        html += `<pre style="background:#eee; padding:10px; overflow-x:auto;">${fileContent}</pre><hr/>`;
      }
      
      html += '</body></html>';
  
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
  
    } catch (e) {
      console.error(e);
      return new Response("שגיאה בשליפת המידע", { status: 500 });
    }
  }