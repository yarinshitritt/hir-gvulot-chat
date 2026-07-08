export async function onRequest(context) {
    const { request } = context;
  
    try {
      const formData = await request.formData();
      const file = formData.get('file');
  
      if (!file) return Response.json({ reply: "לא נשלח קובץ" });
  
      const fileName = file.name;
      const size = (file.size / 1024).toFixed(1);
      
      return Response.json({ 
        reply: `✅ קובץ ${fileName} התקבל (${size} KB).\n\nאני יכול לנתח אותו. מה תרצה לדעת עליו?` 
      });
  
    } catch (e) {
      console.error("Upload Error:", e);
      return Response.json({ reply: "שגיאה בהעלאה - נסה שוב" });
    }
  }