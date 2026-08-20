import { cleanText, parseExcelWorkbookGlobal } from '../_excel.js';

export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.CHAT_KV;

  try {
    const formData = await request.formData();
    const files = formData.getAll('file');

    if (!files.length) return Response.json({ reply: "לא נשלחו קבצים" });

    const results = [];
    for (const file of files) {
      results.push(await processFile(file, kv));
    }

    const reply = results.join(`\n${'='.repeat(30)}\n`);
    return Response.json({ reply });

  } catch (e) {
    console.error(e);
    return Response.json({ reply: "❌ שגיאה בעיבוד הקבצים:\n" + e.message });
  }
}

async function processFile(file, kv) {
  const fileName = file.name;

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlsm')) {
    try {
      const XLSX = await import('xlsx');

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(uint8Array, { type: 'array' });

      const result = parseExcelWorkbookGlobal(workbook, fileName, XLSX);

      console.log(`✅ שם הקובץ: ${fileName}`);
      console.log(`✅ סה"כ רשומות שפענחו: ${result.totalRecords}`);

      const fileKey = `file:${crypto.randomUUID()}:${fileName}`;
      await kv.put(fileKey, cleanText(result.excelContent), { expirationTtl: 60 * 60 * 24 * 7 });

      let successMsg = `✅ קובץ Excel נשמר ופוענח בהצלחה!\n\n📊 סיכום:\n• שם הקובץ: <b>${fileName}</b>\n• סה"כ רשומות: ${result.totalRecords}\n• גיליונות: ${workbook.SheetNames.join(', ')}\n`;

      if (result.groupName) {
        successMsg += `• קבוצה/יחידה זוהתה: <b>${result.groupName}</b> (${result.groupTag})\n`;
      }
      if (result.cycleInfo || result.yearInfo) {
        successMsg += `• מחזור/תקופה זוהה: <b>${result.cycleInfo}${result.yearInfo ? ' ' + result.yearInfo : ''}</b> (${result.fullCycleTag})\n`;
      }

      return successMsg;

    } catch (excelError) {
      console.error("Error parsing Excel:", excelError);
      return `❌ שגיאה בקריאת קובץ Excel <b>${fileName}</b>:\n` + excelError.message;
    }
  } else {
    const text = await file.text();
    await kv.put(`file:${crypto.randomUUID()}:${fileName}`, cleanText(text), { expirationTtl: 60 * 60 * 24 * 7 });

    return `✅ קובץ טקסט ${fileName} נשמר בהצלחה!`;
  }
}
