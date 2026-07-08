export async function onRequest(context) {
    const { request, env } = context;
    const kv = env.CHAT_KV;
  
    try {
      const formData = await request.formData();
      const file = formData.get('file');
  
      if (!file) return Response.json({ reply: "לא נשלח קובץ" });
  
      const fileName = file.name;
      const text = await file.text();
  
      // שמירה ב-KV
      await kv.put(`file:${Date.now()}:${fileName}`, text, { expirationTtl: 60 * 60 * 24 * 7 });
  
      return Response.json({ 
        reply: `✅ קובץ ${fileName} נשמר ב-KV.\n\nעכשיו תוכל לשאול עליו.` 
      });
  
    } catch (e) {
      console.error(e);
      return Response.json({ reply: "שגיאה בשמירה" });
    }
  }