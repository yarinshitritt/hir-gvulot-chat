export async function onRequest(context) {
    const { request } = context;
  
    try {
      const formData = await request.formData();
      const file = formData.get('file');
  
      if (!file) return Response.json({ reply: "לא נשלח קובץ" });
  
      const fileName = file.name;
      const text = await file.text();
  
      // שמירה זמנית בזיכרון (לשיחה נוכחית)
      return Response.json({ 
        reply: `✅ קובץ ${fileName} התקבל.\n\nסיכום ראשוני:\n${text.substring(0, 500)}...` 
      });
  
    } catch (e) {
      console.error(e);
      return Response.json({ reply: "שגיאה בהעלאת הקובץ" });
    }
  }