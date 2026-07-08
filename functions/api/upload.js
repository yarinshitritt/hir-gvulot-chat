export async function onRequest(context) {
    const { request } = context;
  
    try {
      const formData = await request.formData();
      const file = formData.get('file');
  
      if (!file) {
        return Response.json({ reply: "לא נשלח קובץ" });
      }
  
      const fileName = file.name;
  
      return Response.json({ 
        reply: `✅ קובץ ${fileName} התקבל בהצלחה!\nאני יכול לנתח אותו עכשיו.` 
      });
  
    } catch (e) {
      console.error(e);
      return Response.json({ reply: "שגיאה בהעלאת הקובץ" });
    }
  }