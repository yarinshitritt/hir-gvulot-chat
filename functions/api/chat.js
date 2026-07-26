import { systemPrompt } from './prompt.js';

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
      for (const key of list.keys) {
        const fileContent = await kv.get(key.name);
        if (fileContent) {
          fullContext += `\n${fileContent}\n`;
        }
      }

      // 3. בניית היסטוריית השיחה ל-Gemini
      const geminiMessages = [
        {
          role: "user",
          parts: [{ text: fullContext }]
        },
        {
          role: "model",
          parts: [{ text: "הבנתי את ההנחיות והנתונים. אני מוכן לענות על כל שאלה בנושא חי\"ר גבולות וציוני החניכים." }]
        }
      ];

      // הוספת הודעות המשתמש אל היסטוריית השיחה
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

// פונקציית העזר לטיפול בהעלאת קבצים
async function handleFileUpload(request, env) {
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
        
        // קריאה של הקובץ כ-ArrayBuffer ישירות (לא כטקסט!)
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // קריאת ה-Excel מה-Uint8Array
        const workbook = XLSX.read(uint8Array, { type: 'array' });
        
        // קריאה של כל גיליונות העבודה
        let excelContent = `📊 קובץ Excel: ${fileName}\n\n`;
        
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet);
          
          excelContent += `\n--- גיליון: ${sheetName} ---\n`;
          excelContent += `מספר שורות: ${data.length}\n\n`;
          
          // הדפסת נתונים בפורמט קריא
          if (data.length > 0) {
            data.forEach((row, index) => {
              excelContent += `שורה ${index + 1}: `;
              const rowStr = Object.entries(row)
                .filter(([, val]) => val !== null && val !== undefined && val !== '')
                .map(([key, val]) => `${key}: ${val}`)
                .join(" | ");
              excelContent += rowStr + '\n';
            });
          }
        });

        // שמירה ב-KV
        await kv.put(`file:${Date.now()}:${fileName}`, excelContent, { expirationTtl: 60 * 60 * 24 * 7 });

        return Response.json({ 
          reply: `✅ קובץ Excel ${fileName} נשמר בהצלחה!\n\nעכשיו תוכל לשאול אותי על הציונים והנתונים!` 
        });

      } catch (excelError) {
        console.error("Error parsing Excel:", excelError);
        return Response.json({ reply: "❌ שגיאה בקריאת קובץ Excel - ודא שהקובץ תקין" });
      }
    } else {
      // לקבצים רגילים (טקסט וכו')
      const text = await file.text();
      await kv.put(`file:${Date.now()}:${fileName}`, text, { expirationTtl: 60 * 60 * 24 * 7 });

      return Response.json({ 
        reply: `✅ קובץ ${fileName} נשמר בהצלחה!` 
      });
    }

  } catch (e) {
    console.error(e);
    return Response.json({ reply: "❌ שגיאה בעיבוד הקובץ - " + e.message });
  }
}