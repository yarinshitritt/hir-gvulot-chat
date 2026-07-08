export async function onRequest(context) {
    const { request, env } = context;
    const kv = env.CHAT_KV;
  
    try {
      const formData = await request.formData();
      const file = formData.get('file');
  
      if (!file) return Response.json({ reply: "לא נשלח קובץ" });
  
      const fileName = file.name;
      const text = await file.text(); // for now, store as text
  
      // שמירה ב-KV
      await kv.put(`file:${fileName}`, text, { expirationTtl: 60 * 60 * 24 * 30 }); // 30 days
  
      return Response.json({ 
        reply: `✅ קובץ ${fileName} נשמר בהצלחה!\nאני יכול להשתמש בו עכשיו.` 
      });
  
    } catch (e) {
      console.error(e);
      return Response.json({ reply: "שגיאה בשמירת הקובץ" });
    }
  }