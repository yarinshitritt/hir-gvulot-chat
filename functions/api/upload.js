import { cleanText, parseExcelWorkbookGlobal } from '../_excel.js';

export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.CHAT_KV;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) return Response.json({ reply: "לא נשלח קובץ" });

    const fileName = file.name;

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      try {
        const XLSX = await import('xlsx');

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(uint8Array, { type: 'array' });

        const result = parseExcelWorkbookGlobal(workbook, fileName, XLSX);

        console.log(`✅ שם הקובץ: ${fileName}`);
        console.log(`✅ סה"כ רשומות שפענחו: ${result.totalRecords}`);

        const fileKey = `file:${Date.now()}:${fileName}`;
        await kv.put(fileKey, cleanText(result.excelContent), { expirationTtl: 60 * 60 * 24 * 7 });

        let successMsg = `✅ קובץ Excel נשמר ופוענח בהצלחה!\n\n📊 סיכום:\n• שם הקובץ: <b>${fileName}</b>\n• סה"כ רשומות: ${result.totalRecords}\n• גיליונות: ${workbook.SheetNames.join(', ')}\n`;
        
        if (result.groupName) {
          successMsg += `• קבוצה/יחידה זוהתה: <b>${result.groupName}</b> (${result.groupTag})\n`;
        }
        if (result.cycleInfo || result.yearInfo) {
          successMsg += `• מחזור/תקופה זוהה: <b>${result.cycleInfo}${result.yearInfo ? ' ' + result.yearInfo : ''}</b> (${result.fullCycleTag})\n`;
        }
        
        successMsg += `\n🏷️ הנתונים פוענחו בפורמט גלובלי ונשמרו במערכת, כעת ניתן לשאול עליהם בכל עת!`;
        
        return Response.json({ reply: successMsg });

      } catch (excelError) {
        console.error("Error parsing Excel:", excelError);
        return Response.json({ reply: "❌ שגיאה בקריאת קובץ Excel:\n" + excelError.message });
      }
    } else {
      const text = await file.text();
      await kv.put(`file:${Date.now()}:${fileName}`, cleanText(text), { expirationTtl: 60 * 60 * 24 * 7 });

      return Response.json({ 
        reply: `✅ קובץ טקסט ${fileName} נשמר בהצלחה!` 
      });
    }

  } catch (e) {
    console.error(e);
    return Response.json({ reply: "❌ שגיאה בעיבוד הקובץ:\n" + e.message });
  }
}