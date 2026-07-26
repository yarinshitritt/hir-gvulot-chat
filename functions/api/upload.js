export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.CHAT_KV;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) return Response.json({ reply: "לא נשלח קובץ" });

    const fileName = file.name;

    // בדיקה אם זה קובץ Excel
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      try {
        // ייבוא XLSX בצורה דינמית
        const XLSX = await import('xlsx');
        
        // קריאה של הקובץ כ-ArrayBuffer ישירות
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // קריאת ה-Excel
        const workbook = XLSX.read(uint8Array, { type: 'array' });
        
        // קריאה של כל גיליונות העבודה
        let excelContent = `📊 דוח ציונים: ${fileName}\n`;
        excelContent += `תאריך העלאה: ${new Date().toLocaleString('he-IL')}\n`;
        excelContent += `${'='.repeat(100)}\n\n`;
        
        let totalStudents = 0;
        
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          
          // קריאה כמו array כדי להבין את המבנה
          const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // זיהוי שורת ה-headers (בדרך כלל היא מכילה "שם משתמש")
          let headerRowIdx = 0;
          for (let i = 0; i < Math.min(5, allData.length); i++) {
            const row = allData[i];
            if (row && row.join('|').toLowerCase().includes('משתמש')) {
              headerRowIdx = i;
              break;
            }
          }
          
          const headers = allData[headerRowIdx] || [];
          
          // דלג על שורות metadata (משקלים, כותרות סעיפים וכו')
          let dataStartIdx = headerRowIdx + 1;
          while (dataStartIdx < allData.length) {
            const row = allData[dataStartIdx];
            if (!row || row.length === 0 || row.every(v => v === undefined || v === null || v === '')) {
              dataStartIdx++;
              continue;
            }
            
            // בדוק אם זו שורת משקלים (מכילה %)
            const rowStr = row.slice(0, Math.min(15, row.length)).join('|');
            if (rowStr.includes('%') || rowStr.includes('משקל') || rowStr.includes('מחלקה')) {
              dataStartIdx++;
              continue;
            }
            
            break;
          }
          
          const studentRows = allData.slice(dataStartIdx);
          const validStudents = studentRows.filter(r => r && r.some(v => v !== undefined && v !== null && v !== ''));
          
          excelContent += `📋 גיליון: "${sheetName}"\n`;
          excelContent += `${'-'.repeat(100)}\n`;
          excelContent += `כמות החניכים: ${validStudents.length}\n`;
          excelContent += `עמודות ראשיות: ${headers.slice(0, 10).filter(h => h).join(' | ')} ...\n\n`;
          
          // הדפסת כל חניך
          validStudents.forEach((row, index) => {
            // בנה object של student
            const studentData = {};
            headers.forEach((header, colIdx) => {
              if (header) {  // רק אם יש כותרת
                const value = row[colIdx];
                if (value !== undefined && value !== null && value !== '') {
                  studentData[header] = value;
                }
              }
            });
            
            // בדוק אם יש בפועל נתונים משמעותיים
            if (Object.keys(studentData).length > 0) {
              excelContent += `\n👤 חניך ${totalStudents + index + 1}:\n`;
              Object.entries(studentData).slice(0, 15).forEach(([key, value]) => {
                excelContent += `  • ${key}: ${value}\n`;
              });
              
              if (Object.keys(studentData).length > 15) {
                excelContent += `  • ... (עוד ${Object.keys(studentData).length - 15} פריטים)\n`;
              }
            }
          });
          
          totalStudents += validStudents.length;
          excelContent += '\n' + `${'='.repeat(100)}\n\n`;
        });

        excelContent += `\n📊 סיכום כללי:\n`;
        excelContent += `• סה"כ חניכים שזוהו: ${totalStudents}\n`;
        excelContent += `• מספר גיליונות: ${workbook.SheetNames.length}\n`;
        excelContent += `• שם הגיליון הראשי: ${workbook.SheetNames[0]}\n`;

        // שמירה ב-KV
        const fileKey = `file:${Date.now()}:${fileName}`;
        await kv.put(fileKey, excelContent, { expirationTtl: 60 * 60 * 24 * 7 });

        return Response.json({ 
          reply: `✅ קובץ Excel נשמר בהצלחה!\n\n📊 סיכום:\n• סה"כ חניכים: ${totalStudents}\n• גיליונות: ${workbook.SheetNames.join(', ')}\n\n🔍 הקובץ קורא כמו שצריך - בלי metadata מיותר!\n\nעכשיו תוכל לשאול אותי על הציונים, הביצועים, והערכות!` 
        });

      } catch (excelError) {
        console.error("Error parsing Excel:", excelError);
        return Response.json({ reply: "❌ שגיאה בקריאת קובץ Excel:\n" + excelError.message });
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
    return Response.json({ reply: "❌ שגיאה בעיבוד הקובץ:\n" + e.message });
  }
}