export async function onRequest(context) {
    const { request } = context;
  
    try {
      const formData = await request.formData();
      const file = formData.get('file');
  
      if (!file) return Response.json({ reply: "לא נשלח קובץ" });
  
      const fileName = file.name;
      const size = (file.size / 1024).toFixed(1);
      
      // ניתוח בסיסי (לשלב מאוחר יותר נשתמש ב-openpyxl)
      return Response.json({ 
        reply: `✅ קובץ ${fileName} התקבל (${size} KB).\n\nהתחלתי לנתח...\n\nמה תרצה לדעת?\n- ממוצע כללי\n- חניכים עם ציון נמוך\n- סיכום לפי מחלקה` 
      });
  
    } catch (e) {
      console.error(e);
      return Response.json({ reply: "שגיאה בהעלאה" });
    }
  }