export async function onRequest(context) {
    const { request } = context;
  
    try {
      const formData = await request.formData();
      const file = formData.get('file');
  
      if (!file) return Response.json({ reply: "לא נשלח קובץ" });
  
      const fileName = file.name;
      
      // קריאה כ-ArrayBuffer כדי לטפל ב-xlsx
      const arrayBuffer = await file.arrayBuffer();
      
      return Response.json({ 
        reply: `✅ קובץ ${fileName} התקבל (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB).\n\nאני יכול לנתח אותו עכשיו. מה תרצה לדעת? (ממוצעים, חניכים נכשלים וכו')` 
      });
  
    } catch (e) {
      console.error(e);
      return Response.json({ reply: "שגיאה בהעלאת הקובץ" });
    }
  }