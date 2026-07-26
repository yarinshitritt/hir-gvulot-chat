export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.CHAT_KV;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) return Response.json({ reply: "לא נשלח קובץ" });

    const fileName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // בדיקה אם זה קובץ Excel
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      try {
        // ייבוא XLSX בצורה דינמית
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        // קריאה של כל גיליונות העבודה
        let excelContent = `📊 דוח ציונים: ${fileName}\n`;
        excelContent += `תאריך העלאה: ${new Date().toLocaleString('he-IL')}\n`;
        excelContent += `=`.repeat(60) + '\n\n';
        
        let totalStudents = 0;
        
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet);
          
          excelContent += `📋 גיליון: "${sheetName}"\n`;
          excelContent += `-`.repeat(60) + '\n';
          excelContent += `כמות החניכים: ${data.length}\n\n`;
          
          // הדפסת הגדרות של העמודות
          if (data.length > 0) {
            const headers = Object.keys(data[0]);
            excelContent += `עמודות זמינות: ${headers.join(', ')}\n\n`;
            
            // הדפסת כל חניך עם הציונים שלו
            data.forEach((row, index) => {
              // סינון ערכים ריקים
              const studentData = Object.entries(row)
                .filter(([, val]) => val !== null && val !== undefined && val !== '')
                .reduce((acc, [key, val]) => {
                  acc[key] = val;
                  return acc;
                }, {});
              
              if (Object.keys(studentData).length > 0) {
                excelContent += `\n👤 חניך ${index + 1}:\n`;
                Object.entries(studentData).forEach(([key, value]) => {
                  excelContent += `  • ${key}: ${value}\n`;
                });
              }
            });
            
            totalStudents += data.length;
          }
          
          excelContent += '\n' + `=`.repeat(60) + '\n\n';
        });

        excelContent += `\n📊 סיכום כללי:\n`;
        excelContent += `• סה"כ חניכים: ${totalStudents}\n`;
        excelContent += `• מספר גיליונות: ${workbook.SheetNames.length}\n`;

        // שמירה ב-KV
        const fileKey = `file:${Date.now()}:${fileName}`;
        await kv.put(fileKey, excelContent, { expirationTtl: 60 * 60 * 24 * 7 });

        return Response.json({ 
          reply: `✅ קובץ Excel ${fileName} נשמר בהצלחה!\n\n📊 סיכום:\n• סה"כ חניכים: ${totalStudents}\n• גיליונות: ${workbook.SheetNames.join(', ')}\n\nעכשיו תוכל לשאול אותי על הציונים, הביצועים, והערכות!` 
        });

      } catch (excelError) {
        console.error("Error parsing Excel:", excelError);
        return Response.json({ reply: "❌ שגיאה בקריאת קובץ Excel - ודא שהקובץ תקין וממוקד ב-XLSX או XLS" });
      }
    } else {
      // לקבצים רגילים (טקסט וכו')
      const text = await file.text();
      await kv.put(`file:${Date.now()}:${fileName}`, text, { expirationTtl: 60 * 60 * 24 * 7 });

      return Response.json({ 
        reply: `✅ קובץ טקסט ${fileName} נשמר בהצלחה!` 
      });
    }

  } catch (e) {
    console.error(e);
    return Response.json({ reply: "❌ שגיאה בעיבוד הקובץ: " + e.message });
  }
}