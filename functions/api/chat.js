import { systemPrompt } from './prompt.js';
import { cleanText, parseExcelWorkbookGlobal } from '../_excel.js';

const STOPWORDS = new Set([
  'את', 'של', 'על', 'עם', 'אני', 'אתה', 'אתם', 'הוא', 'היא', 'אנחנו', 'הם', 'הן',
  'זה', 'זאת', 'אלה', 'אלו', 'מה', 'מי', 'איך', 'איפה', 'מתי', 'למה', 'כי', 'אבל',
  'או', 'גם', 'רק', 'כל', 'כמה', 'יש', 'אין', 'היה', 'יהיה', 'לא', 'כן', 'אם', 'אז',
  'כאשר', 'אחרי', 'לפני', 'תוך', 'בין', 'אל', 'מן', 'עד', 'כדי', 'בגלל', 'תן', 'לי',
  'בבקשה', 'שלום', 'תודה', 'אפשר', 'רוצה', 'צריך', 'הצג', 'הראה', 'ספר', 'תגיד', 'נא',
  'רשימה', 'נתונים', 'עליהם', 'עליו', 'עליה', 'לך'
]);

// אותיות יחס נפוצות שמתחברות ישירות למילה בעברית (ב-קרקל, ל-קרקל וכו') -
// כדי שחיפוש "בקרקל" עדיין ימצא קבצים ששמם "קרקל"
const HEBREW_PREFIXES = ['ב', 'ל', 'מ', 'ו', 'כ', 'ש'];

// שולף מילות חיפוש משמעותיות מהשאלה של המשתמש, כדי לדעת אילו קבצים רלוונטיים לה
function extractQueryTerms(text) {
  if (!text) return [];
  const words = text
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !STOPWORDS.has(w));

  const terms = new Set(words);
  for (const w of words) {
    if (w.length >= 3 && HEBREW_PREFIXES.includes(w[0])) {
      const stripped = w.slice(1);
      if (stripped.length >= 2 && !STOPWORDS.has(stripped)) {
        terms.add(stripped);
      }
    }
  }
  return [...terms];
}

function countOccurrences(haystack, needle) {
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

// ניקוד קובץ לפי כמות ההתאמות למילות החיפוש - התאמה בשם הקובץ היא הסימן החזק ביותר.
// התאמת תוכן בודדת (מופע אחד) לא סופרת - כדי שקובץ ענק לא ייכנס רק בגלל מילה כללית
// שהופיעה בו במקרה פעם אחת
function scoreFile(file, terms) {
  let score = 0;
  for (const term of terms) {
    if (file.name.includes(term)) score += 10;
    const count = countOccurrences(file.content, term);
    if (count >= 2) score += Math.min(count, 15);
  }
  return score;
}

// כמה הודעות מותר לכתובת IP אחת בחלון של שעה - הגנה מפני ניצול לרעה (וגם מוציא
// כסף אמיתי מהרגע שעוברים ל-tier בתשלום). המונה נשמר ב-KV עם תפוגה אוטומטית של שעה
const RATE_LIMIT_PER_HOUR = 30;

async function checkRateLimit(kv, ip) {
  const hourBucket = new Date().toISOString().slice(0, 13); // e.g. "2026-08-20T11"
  const key = `ratelimit:${ip}:${hourBucket}`;
  const current = parseInt((await kv.get(key)) || "0", 10);
  if (current >= RATE_LIMIT_PER_HOUR) return false;
  await kv.put(key, String(current + 1), { expirationTtl: 3600 });
  return true;
}

// כמה הודעות אחרונות מהשיחה לשלוח ל-Gemini - שיחה ארוכה לא צריכה לגרור מחדש
// את כל ההיסטוריה בכל תור, זה רק מנפח טוקנים בלי תועלת אמיתית
const MAX_HISTORY_MESSAGES = 12;

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
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const allowed = await checkRateLimit(kv, ip);
      if (!allowed) {
        return Response.json({ reply: `⏳ הגעת למגבלת ${RATE_LIMIT_PER_HOUR} הודעות לשעה. נסה שוב בעוד כמה דקות.` });
      }

      const { messages } = await request.json();
      const GEMINI_API_KEY = env.GEMINI_API_KEY;

      if (!GEMINI_API_KEY) {
        return Response.json({ reply: "ה-Key לא מוגדר ב-Cloudflare" });
      }

      // 1. טעינת הפרומפט הבסיסי
      let fullContext = systemPrompt + "\n\n--- נתונים מהקבצים שהועלו ---\n";

      // 2. משיכת כל הקבצים שהמשתמשים העלו ל-KV (מהישן לחדש, לפי סדר ההעלאה)
      const list = await kv.list({ prefix: "file:" });

      const filesList = [];

      for (const key of list.keys) {
        const fileContent = await kv.get(key.name);
        if (fileContent) {
          const fileName = key.name.split(':').pop();
          filesList.push({ name: fileName, content: fileContent });
        }
      }

      // בוחרים קודם את הקבצים הרלוונטיים לשאלה האחרונה של המשתמש (במקום לשלוח הכל תמיד),
      // כדי לחסוך טוקנים ולשפר דיוק. אם לא זוהו מילות חיפוש או שכלום לא התאים - חוזרים
      // לסדר ההעלאה הרגיל.
      const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";
      const queryTerms = extractQueryTerms(lastUserMessage);

      let orderedFiles = filesList;
      if (queryTerms.length) {
        const matched = filesList
          .map(file => ({ file, score: scoreFile(file, queryTerms) }))
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(s => s.file);
        if (matched.length) orderedFiles = matched;
      }

      // מכסת הטוקנים של Gemini מוגבלת (tier חינמי), אז טוענים קבצים לפי סדר הרלוונטיות
      // עד כמה שנכנס, ומדלגים על השאר במקום לשלוח בקשה שתיכשל
      const MAX_FILE_CONTENT_CHARS = 300000;
      let usedChars = 0;
      const includedFiles = [];
      const skippedFiles = [];
      for (const file of orderedFiles) {
        if (usedChars + file.content.length > MAX_FILE_CONTENT_CHARS) {
          skippedFiles.push(file.name);
          continue;
        }
        usedChars += file.content.length;
        includedFiles.push(file);
      }

      fullContext += `\n${'='.repeat(100)}\n`;
      fullContext += `📌 קבצים ודוחות שהועלו למערכת (סה"כ ${filesList.length} קבצים, ${includedFiles.length} מתוכם נטענו בשיחה הזו עקב מגבלת גודל):\n`;
      for (const file of includedFiles) {
        fullContext += `- קובץ: ${file.name}\n`;
      }
      if (skippedFiles.length) {
        fullContext += `\n⚠️ הקבצים הבאים לא נטענו בשיחה הזו עקב מגבלת גודל - אם נשאלת עליהם, ציין זאת במפורש:\n`;
        for (const name of skippedFiles) {
          fullContext += `- ${name}\n`;
        }
      }

      fullContext += `\n${'='.repeat(100)}\n`;
      fullContext += `🔴 הנחיות קריאה:\n`;
      fullContext += `קרא את הנתונים הטבלאיים של כל קובץ באופן עצמאי ומדויק בהתאם לעמודות והשורות שפוענחו.\n`;
      fullContext += `${'='.repeat(100)}\n`;

      fullContext += `\n📊 הנתונים המלאים מהקבצים:\n`;
      fullContext += `${'='.repeat(100)}\n`;

      for (const file of includedFiles) {
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

      messages.slice(-MAX_HISTORY_MESSAGES).forEach(m => {
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