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

      // 1. טעינת הפרומפט הבסיסי מקובץ ה-JS שהגדרנו
      let fullContext = systemPrompt + "\n\n--- מידע נוסף ממסד הנתונים (קבצים שהועלו) ---\n";

      // 2. משיכת כל הקבצים שהמשתמשים העלו ל-KV
      const list = await kv.list({ prefix: "file:" });
      for (const key of list.keys) {
        const fileContent = await kv.get(key.name);
        if (fileContent) {
          fullContext += `\nתוכן הקובץ ${key.name}:\n${fileContent}\n`;
        }
      }

      // 3. בניית היסטוריית השיחה ל-Gemini
      // מתחילים עם הזרקת המוח של הבוט והמידע מ-KV
      const geminiMessages = [
        {
          role: "user",
          parts: [{ text: fullContext }]
        },
        {
          role: "model",
          parts: [{ text: "הבנתי את ההנחיות. אני מוכן לענות על כל שאלה בנושא חי\"ר גבולות, תורות לחימה, וציוני החניכים." }]
        }
      ];

      // הוספת הודעות המשתמש אל היסטוריית השיחה
      messages.forEach(m => {
        geminiMessages.push({
          role: m.role === "system" ? "user" : m.role,
          parts: [{ text: m.content }]
        });
      });

      // 4. שליחה ל-Gemini (שמתי לך פה את המודל שהגדרת - flash-lite)
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000
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

// (אופציונלי - אם חסר לך הטיפול בהעלאה בתוך הקובץ הזה למרות שיש לך את upload.js)
// פונקציית העזר למקרה שאתה קורא להעלאה דרך אותו הראוט
async function handleFileUpload(request, env) {
  const kv = env.CHAT_KV;
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) return Response.json({ reply: "לא נשלח קובץ" });

    const fileName = file.name;
    const text = await file.text();

    await kv.put(`file:${Date.now()}:${fileName}`, text, { expirationTtl: 60 * 60 * 24 * 7 });

    return Response.json({ 
      reply: `✅ קובץ ${fileName} נשמר במערכת.\n\nעכשיו תוכל לשאול עליו.` 
    });

  } catch (e) {
    console.error(e);
    return Response.json({ reply: "שגיאה בשמירה" });
  }
}