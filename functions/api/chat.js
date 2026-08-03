import { systemPrompt } from './prompt.js';
import { cleanText, parseExcelWorkbookGlobal } from '../_excel.js';

export async function onRequest(context) {
    const { request, env } = context;
    const kv = env.CHAT_KV;
    
    // תמיכה בהעלאת קבצים (POST עם FormData)
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      return handleFileUpload(request, env);
    }

    // בקשה רגילה של צ'אט
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
  
    try {
      const { messages } = await request.json();
      const GEMINI_API_KEY = env.GEMINI_API_KEY;

      if (!GEMINI_API_KEY) {
        return Response.json({ reply: "ה-Key לא מוגדר ב-Cloudflare" });
      }

      // 1. טעינת הפרומפט הבסיסי
      let fullContext = systemPrompt + "\n\n--- נתונים מהקבצים שהועלו ---\n";

      // 2. משיכת כל הקבצים שהמשתמשים העלו ל-KV
      const list = await kv.list({ prefix: "file:" });
      
      const filesList = [];
      
      for (const key of list.keys) {
        const fileContent = await kv.get(key.name);
        if (fileContent) {
          const fileName = key.name.split(':').pop();
          filesList.push({ name: fileName, content: fileContent });
        }
      }

      fullContext += `\n${'='.repeat(100)}\n`;
      fullContext += `📌 קבצים ודוחות שהועלו למערכת (סה"כ ${filesList.length} קבצים):\n`;
      for (const file of filesList) {
        fullContext += `- קובץ: ${file.name}\n`;
      }
      
      fullContext += `\n${'='.repeat(100)}\n`;
      fullContext += `🔴 הנחיות קריאה:\n`;
      fullContext += `קרא את הנתונים הטבלאיים של כל קובץ באופן עצמאי ומדויק בהתאם לעמודות והשורות שפוענחו.\n`;
      fullContext += `${'='.repeat(100)}\n`;

      fullContext += `\n📊 הנתונים המלאים מהקבצים:\n`;
      fullContext += `${'='.repeat(100)}\n`;

      for (const file of filesList) {
        fullContext += `\n📄 קובץ: ${file.name}\n`;
        fullContext += file.content;
        fullContext += `\n✓ סיום קובץ ${file.name}\n`;
        fullContext += `${'#'.repeat(50)}\n`;
      }

      // 3. בניית היסטוריית השיחה ל-Gemini
      const geminiMessages = [
        {
          role: "user",
          parts: [{ text: fullContext }]
        },
        {
          role: "model",
          parts: [{ text: "הבנתי היטב. המערכת מקבלת דוחות וטבלאות אקסל מכל סוג שהם. אני אזהה ואנתח את כל הנתונים, העמודות והשורות באופן עצמאי ומדויק." }]
        }
      ];

      messages.forEach(m => {
        geminiMessages.push({
          role: m.role === "system" ? "user" : m.role,
          parts: [{ text: m.content }]
        });
      });

      // 4. שליחה ל-Gemini
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000
            }
          })
        }
      );

      if (!geminiRes.ok) {
        const err = await geminiRes.text();
        console.error("Gemini Error:", err);
        return Response.json({ reply: "שגיאה בגישה ל-Gemini" });
      }

      const data = await geminiRes.json();
      
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text 
                 || data.error?.message 
                 || "לא קיבלתי תשובה";

      return Response.json({ reply });

    } catch (error) {
      console.error("Server Error:", error);
      return Response.json({ reply: "שגיאה בשרת - נסה שוב" });
    }
}

async function handleFileUpload(request, env) {
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

        const fileKey = `file:${Date.now()}:${fileName}`;
        await kv.put(fileKey, cleanText(result.excelContent), { expirationTtl: 60 * 60 * 24 * 7 });

        let successMsg = `✅ קובץ Excel נשמר ופוענח בהצלחה!\n\n📊 סיכום:\n• שם הקובץ: **${fileName}**\n• סה"כ רשומות: ${result.totalRecords}\n• גיליונות: ${workbook.SheetNames.join(', ')}\n`;
        
        if (result.groupName) {
          successMsg += `• קבוצה/יחידה זוהתה: **${result.groupName}** (${result.groupTag})\n`;
        }
        if (result.cycleInfo || result.yearInfo) {
          successMsg += `• מחזור/תקופה זוהה: **${result.cycleInfo}${result.yearInfo ? ' ' + result.yearInfo : ''}** (${result.fullCycleTag})\n`;
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