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
      
      // בנה מפה של קבוצות ומחזורים
      const filesByGroupAndCycle = {};
      
      for (const key of list.keys) {
        const fileContent = await kv.get(key.name);
        if (fileContent) {
          // חלץ את שם הקובץ ממפתח ה-KV
          const fileName = key.name.split(':').pop();
          
          // זיהוי הקבוצה משם הקובץ
          let groupName = 'unknown';
          let groupTag = '[UNKNOWN]';
          
          if (fileName.toLowerCase().includes('קרקל')) {
            groupName = 'קרקל';
            groupTag = '[קרקל]';
          } else if (fileName.toLowerCase().includes('ברדלס')) {
            groupName = 'ברדלס';
            groupTag = '[ברדלס]';
          } else if (fileName.toLowerCase().includes('אריות')) {
            groupName = 'אריות';
            groupTag = '[אריות]';
          } else if (fileName.toLowerCase().includes('מתקדם')) {
            groupName = 'מתקדם';
            groupTag = '[מתקדם]';
          } else if (fileName.toLowerCase().includes('בסיסי')) {
            groupName = 'בסיסי';
            groupTag = '[בסיסי]';
          }
          
          // זיהוי המחזור משם הקובץ בלבד!
          // 🔴 סינון תאריך ההעלאה קודם!
          let relevantPart = fileName.toLowerCase();
          
          // הסר תאריכים בפורמט _DD-MM-YYYY
          relevantPart = relevantPart.replace(/_\d{2}-\d{2}-\d{4}/, '');
          relevantPart = relevantPart.replace(/_\d{2}\.\d{2}\.\d{4}/, '');
          
          // הסר סיומות קובץ
          relevantPart = relevantPart.replace(/\.(xlsx|xls|csv|json|txt)$/g, '');
          
          let cycleInfo = '';
          let cycleTag = '';
          
          if (relevantPart.includes('_נוב_') || relevantPart.includes(' נוב ') || 
              relevantPart.includes('נוב_') || relevantPart.includes('_נוב')) {
            cycleInfo = 'נובמבר';
            cycleTag = '[נוב]';
          }
          else if (relevantPart.includes('_מר_') || relevantPart.includes(' מר ') ||
                   relevantPart.includes('מרץ')) {
            cycleInfo = 'מרץ';
            cycleTag = '[מר]';
          }
          else if (relevantPart.includes('_יון_') || relevantPart.includes(' יון ') ||
                   relevantPart.includes('יוני')) {
            cycleInfo = 'יוני';
            cycleTag = '[יון]';
          }
          else if (relevantPart.includes('_ין_') || relevantPart.includes(' ין ') ||
                   relevantPart.includes('ינואר')) {
            cycleInfo = 'ינואר';
            cycleTag = '[ין]';
          }
          else if (relevantPart.includes('_פב_') || relevantPart.includes(' פב ') ||
                   relevantPart.includes('פברואר')) {
            cycleInfo = 'פברואר';
            cycleTag = '[פב]';
          }
          else if (relevantPart.includes('_אפ_') || relevantPart.includes(' אפ ') ||
                   relevantPart.includes('אפריל')) {
            cycleInfo = 'אפריל';
            cycleTag = '[אפ]';
          }
          else if (relevantPart.includes('_מאי_') || relevantPart.includes(' מאי ') ||
                   relevantPart.includes('-מאי-')) {
            cycleInfo = 'מאי';
            cycleTag = '[מאי]';
          }
          else if (relevantPart.includes('_יול_') || relevantPart.includes(' יול ') ||
                   relevantPart.includes('יולי')) {
            cycleInfo = 'יולי';
            cycleTag = '[יול]';
          }
          else if (relevantPart.includes('_אוג_') || relevantPart.includes(' אוג ') ||
                   relevantPart.includes('אוגוסט')) {
            cycleInfo = 'אוגוסט';
            cycleTag = '[אוג]';
          }
          else if (relevantPart.includes('_ספ_') || relevantPart.includes(' ספ ') ||
                   relevantPart.includes('ספטמבר')) {
            cycleInfo = 'ספטמבר';
            cycleTag = '[ספ]';
          }
          else if (relevantPart.includes('_אוק_') || relevantPart.includes(' אוק ') ||
                   relevantPart.includes('אוקטובר')) {
            cycleInfo = 'אוקטובר';
            cycleTag = '[אוק]';
          }
          else if (relevantPart.includes('_דצ_') || relevantPart.includes(' דצ ') ||
                   relevantPart.includes('דצמבר')) {
            cycleInfo = 'דצמבר';
            cycleTag = '[דצ]';
          }
          
          // 🔴 זיהוי שנה משם הקובץ בלבד, בחלק הרלוונטי!
          let yearInfo = '';
          if (relevantPart.includes('2025')) {
            yearInfo = '2025';
          } else if (relevantPart.includes('2026')) {
            yearInfo = '2026';
          }
          // חפש "25" או "26" בצורה בטוחה
          else if (relevantPart.match(/[\s_-]25[\s_\.]|^25[\s_\.]|[\s_-]25$|^25$/)) {
            yearInfo = '2025';
          } else if (relevantPart.match(/[\s_-]26[\s_\.]|^26[\s_\.]|[\s_-]26$|^26$/)) {
            yearInfo = '2026';
          }
          
          let fullCycleTag = '';
          if (cycleInfo && yearInfo) {
            fullCycleTag = `${cycleTag}${yearInfo.substring(2)}`;
          } else if (cycleInfo) {
            fullCycleTag = cycleTag;
          } else if (yearInfo) {
            fullCycleTag = `[${yearInfo}]`;
          }
          
          // בנה קלידי כ"group_cycle"
          const compositeKey = `${groupTag}${fullCycleTag || '[NO-CYCLE]'}`;
          
          if (!filesByGroupAndCycle[compositeKey]) {
            filesByGroupAndCycle[compositeKey] = { 
              group: groupName, 
              groupTag: groupTag,
              cycle: cycleInfo, 
              year: yearInfo,
              cycleTag: fullCycleTag,
              files: [] 
            };
          }
          filesByGroupAndCycle[compositeKey].files.push({ name: fileName, content: fileContent });
        }
      }

      // 3. בנה קונטקסט עם הפרדה קפדנית לפי קבוצה ומחזור
      fullContext += `\n${'='.repeat(100)}\n`;
      fullContext += `📌 קבוצות ומחזורים שהועלו:\n`;
      for (const compositeKey in filesByGroupAndCycle) {
        const info = filesByGroupAndCycle[compositeKey];
        fullContext += `- ${info.groupTag}${info.cycleTag || ''} ${info.group}${info.cycle ? ' (' + info.cycle + (info.year ? ' ' + info.year : '') + ')' : ''}: ${info.files.length} קובץ/ים\n`;
      }
      
      fullContext += `\n${'='.repeat(100)}\n`;
      fullContext += `🔴 חשוב מאוד: המחזור זוהה משם הקובץ בלבד (לא מתוך הנתונים וגם לא מתוך תאריך ההעלאה!)!\n`;
      fullContext += `לדוגמה: [קרקל][נוב]25 → קרקל בנובמבר 2025\n`;
      fullContext += `${'='.repeat(100)}\n`;
      
      fullContext += `\n📊 הנתונים המלאים (מחולקים לפי קבוצות ומחזורים):\n`;
      fullContext += `${'='.repeat(100)}\n`;
      
      // הוסף את כל הנתונים מחולקים לפי קבוצה ומחזור
      for (const compositeKey in filesByGroupAndCycle) {
        const info = filesByGroupAndCycle[compositeKey];
        fullContext += `\n${'#'.repeat(50)}\n`;
        fullContext += `📌 קבוצה: ${info.groupTag} ${info.group}\n`;
        if (info.cycle) {
          fullContext += `📅 מחזור: ${info.cycleTag} ${info.cycle}${info.year ? ' ' + info.year : ''}\n`;
        }
        fullContext += `${'#'.repeat(50)}\n`;
        fullContext += `🔴 זכור: המחזור זוהה משם הקובץ בלבד (לא מתוך תאריך ההעלאה!)!\n`;
        
        for (const file of info.files) {
          fullContext += `\n📁 קובץ: ${file.name}\n`;
          fullContext += file.content;
          fullContext += `\n✓ סיום חלק של ${info.groupTag}${info.cycleTag || ''}\n`;
        }
        
        fullContext += `\n${'#'.repeat(50)}\n`;
      }

      fullContext += `\n${'='.repeat(100)}\n`;
      fullContext += `📋 הנחיה קריטית:\n`;
      fullContext += `כשמשתמש שואל על חניך כלשהו, בדוק את התגים שלו - קבוצה ומחזור!\n`;
      fullContext += `🔴 המחזור משם הקובץ בלבד - לא משום דבר אחר (לא מתוך תאריך ההעלאה)!\n`;
      fullContext += `אל תערבב חניכים בין קבוצות או בין מחזורים גם אם השמות דומים!\n`;
      fullContext += `${'='.repeat(100)}\n`;

      // 4. בניית היסטוריית השיחה ל-Gemini
      const geminiMessages = [
        {
          role: "user",
          parts: [{ text: fullContext }]
        },
        {
          role: "model",
          parts: [{ text: "הבנתי את ההנחיות תוך כדי שמירה קפדנית על התגים של הקבוצות והמחזורים. המחזור זוהה משם הקובץ בלבד (לא מתוך הנתונים בתוך הקובץ וגם לא מתוך תאריך ההעלאה). כל חניך כולל תג קבוצה וגם תג מחזור מהשם בלבד. אני לא אערבב בינהם ולא אחשוב שחניך של קבוצה או מחזור אחד שייך לקבוצה או מחזור אחר." }]
        }
      ];

      // הוספת הודעות המשתמש
      messages.forEach(m => {
        geminiMessages.push({
          role: m.role === "system" ? "user" : m.role,
          parts: [{ text: m.content }]
        });
      });

      // 5. שליחה ל-Gemini
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

function cleanText(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\uFEFF\u200B-\u200D\uFFFD]/g, '')
    .trim();
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
        
        // זיהוי קבוצה משם הקובץ
        let groupName = '[קבוצה לא מזוהה]';
        let groupTag = '[UNKNOWN]';
        
        if (fileName.toLowerCase().includes('קרקל')) {
          groupName = 'קרקל';
          groupTag = '[קרקל]';
        } else if (fileName.toLowerCase().includes('ברדלס')) {
          groupName = 'ברדלס';
          groupTag = '[ברדלס]';
        } else if (fileName.toLowerCase().includes('אריות')) {
          groupName = 'אריות';
          groupTag = '[אריות]';
        } else if (fileName.toLowerCase().includes('מתקדם')) {
          groupName = 'אימון מתקדם';
          groupTag = '[מתקדם]';
        } else if (fileName.toLowerCase().includes('בסיסי')) {
          groupName = 'אימון בסיסי';
          groupTag = '[בסיסי]';
        }
        
        // 🔴 סינון תאריך ההעלאה קודם!
        let relevantPart = fileName.toLowerCase();
        
        // הסר תאריכים בפורמט _DD-MM-YYYY
        relevantPart = relevantPart.replace(/_\d{2}-\d{2}-\d{4}/, '');
        relevantPart = relevantPart.replace(/_\d{2}\.\d{2}\.\d{4}/, '');
        
        // הסר סיומות קובץ
        relevantPart = relevantPart.replace(/\.(xlsx|xls|csv|json|txt)$/g, '');
        
        // זיהוי מחזור משם הקובץ בלבד!
        let cycleInfo = '';
        let cycleTag = '';
        
        if (relevantPart.includes('_נוב_') || relevantPart.includes(' נוב ') || 
            relevantPart.includes('-נוב-') || relevantPart.includes('נוב_') ||
            relevantPart.includes('_נוב') || relevantPart.includes('נוב ')) {
          cycleInfo = 'נובמבר';
          cycleTag = '[נוב]';
        }
        else if (relevantPart.includes('_מר_') || relevantPart.includes(' מר ') ||
                 relevantPart.includes('-מר-') || relevantPart.includes('מרץ')) {
          cycleInfo = 'מרץ';
          cycleTag = '[מר]';
        }
        else if (relevantPart.includes('_יון_') || relevantPart.includes(' יון ') ||
                 relevantPart.includes('-יון-') || relevantPart.includes('יוני')) {
          cycleInfo = 'יוני';
          cycleTag = '[יון]';
        }
        else if (relevantPart.includes('_ין_') || relevantPart.includes(' ין ') ||
                 relevantPart.includes('-ין-') || relevantPart.includes('ינואר')) {
          cycleInfo = 'ינואר';
          cycleTag = '[ין]';
        }
        else if (relevantPart.includes('_פב_') || relevantPart.includes(' פב ') ||
                 relevantPart.includes('-פב-') || relevantPart.includes('פברואר')) {
          cycleInfo = 'פברואר';
          cycleTag = '[פב]';
        }
        else if (relevantPart.includes('_אפ_') || relevantPart.includes(' אפ ') ||
                 relevantPart.includes('-אפ-') || relevantPart.includes('אפריל')) {
          cycleInfo = 'אפריל';
          cycleTag = '[אפ]';
        }
        else if (relevantPart.includes('_מאי_') || relevantPart.includes(' מאי ')) {
          cycleInfo = 'מאי';
          cycleTag = '[מאי]';
        }
        else if (relevantPart.includes('_יול_') || relevantPart.includes(' יול ') ||
                 relevantPart.includes('יולי')) {
          cycleInfo = 'יולי';
          cycleTag = '[יול]';
        }
        else if (relevantPart.includes('_אוג_') || relevantPart.includes(' אוג ') ||
                 relevantPart.includes('אוגוסט')) {
          cycleInfo = 'אוגוסט';
          cycleTag = '[אוג]';
        }
        else if (relevantPart.includes('_ספ_') || relevantPart.includes(' ספ ') ||
                 relevantPart.includes('ספטמבר')) {
          cycleInfo = 'ספטמבר';
          cycleTag = '[ספ]';
        }
        else if (relevantPart.includes('_אוק_') || relevantPart.includes(' אוק ') ||
                 relevantPart.includes('אוקטובר')) {
          cycleInfo = 'אוקטובר';
          cycleTag = '[אוק]';
        }
        else if (relevantPart.includes('_דצ_') || relevantPart.includes(' דצ ') ||
                 relevantPart.includes('דצמבר')) {
          cycleInfo = 'דצמבר';
          cycleTag = '[דצ]';
        }
        
        // 🔴 זיהוי שנה משם הקובץ בלבד, בחלק הרלוונטי!
        let yearInfo = '';
        
        if (relevantPart.includes('2025')) {
          yearInfo = '2025';
        } else if (relevantPart.includes('2026')) {
          yearInfo = '2026';
        }
        else if (relevantPart.match(/[\s_-]25[\s_\.]|^25[\s_\.]|[\s_-]25$|^25$/)) {
          yearInfo = '2025';
        } else if (relevantPart.match(/[\s_-]26[\s_\.]|^26[\s_\.]|[\s_-]26$|^26$/)) {
          yearInfo = '2026';
        }
        
        let fullCycleTag = '';
        if (cycleInfo && yearInfo) {
          fullCycleTag = `${cycleTag}${yearInfo.substring(2)}`;
        } else if (cycleInfo) {
          fullCycleTag = cycleTag;
        } else if (yearInfo) {
          fullCycleTag = `[${yearInfo}]`;
        }
        
        console.log(`✅ שם הקובץ: ${fileName}`);
        console.log(`✅ חלק רלוונטי: ${relevantPart}`);
        console.log(`✅ זוהה קבוצה: ${groupTag} ${groupName}`);
        console.log(`✅ זוהה מחזור: ${fullCycleTag} ${cycleInfo} ${yearInfo}`);
        
        let excelContent = `📊 **שם הקובץ: ${fileName}**\n`;
        excelContent += `תאריך העלאה: ${new Date().toLocaleString('he-IL')}\n`;
        excelContent += `${'='.repeat(100)}\n\n`;
        
        excelContent += `📌 קבוצה/יחידה: **${groupName}** (תג: ${groupTag})\n`;
        if (cycleInfo || yearInfo) {
          excelContent += `📅 מחזור/תקופה: **${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}** (תג: ${fullCycleTag})\n`;
        } else {
          excelContent += `⚠️ ⚠️ ⚠️ לא זוהה מחזור בשם הקובץ!\n`;
        }
        excelContent += `${'='.repeat(100)}\n\n`;
        excelContent += `✅ זיהוי מחזור ממשם הקובץ בלבד (לא מתוך הנתונים וגם לא מתוך תאריך ההעלאה!)\n`;
        excelContent += `⚠️ חשוב: כל חניך בקבוצה זו יתויג כ-${groupTag}${fullCycleTag}\n`;
        excelContent += `${'='.repeat(100)}\n\n`;
        
        let totalStudents = 0;
        
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          let headerRowIdx = 0;
          for (let i = 0; i < Math.min(5, allData.length); i++) {
            const row = allData[i];
            if (row && row.join('|').toLowerCase().includes('משתמש')) {
              headerRowIdx = i;
              break;
            }
          }
          
          const headers = allData[headerRowIdx] || [];
          
          let dataStartIdx = headerRowIdx + 1;
          while (dataStartIdx < allData.length) {
            const row = allData[dataStartIdx];
            if (!row || row.length === 0 || row.every(v => v === undefined || v === null || v === '')) {
              dataStartIdx++;
              continue;
            }
            
            const rowStr = row.slice(0, Math.min(15, row.length)).join('|');
            if (rowStr.includes('%') || rowStr.includes('משקל') || rowStr.includes('מחלקה')) {
              dataStartIdx++;
              continue;
            }
            
            break;
          }
          
          const studentRows = allData.slice(dataStartIdx);
          const validStudents = studentRows.filter(r => r && r.some(v => v !== undefined && v !== null && v !== ''));
          
          excelContent += `📋 גיליון: "${sheetName}" (קבוצה: ${groupTag}${fullCycleTag})\n`;
          excelContent += `${'-'.repeat(100)}\n`;
          excelContent += `כמות החניכים: ${validStudents.length}\n`;
          excelContent += `עמודות ראשיות: ${headers.slice(0, 10).filter(h => h).map(h => cleanText(h)).filter(Boolean).join(' | ')} ...\n\n`;
          
          validStudents.forEach((row, index) => {
            const studentData = {};
            headers.forEach((header, colIdx) => {
              if (header) {
                const cleanedHeader = cleanText(header);
                const value = cleanText(row[colIdx]);
                if (cleanedHeader && value !== '') {
                  studentData[cleanedHeader] = value;
                }
              }
            });
            
            if (Object.keys(studentData).length > 0) {
              excelContent += `\n${groupTag} ${fullCycleTag} 👤 חניך ${totalStudents + index + 1}:\n`;
              
              excelContent += `  • קבוצה: ${groupName}\n`;
              excelContent += `  • תג קבוצה: ${groupTag}\n`;
              if (cycleInfo || yearInfo) {
                excelContent += `  • מחזור: ${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}\n`;
                excelContent += `  • תג מחזור: ${fullCycleTag} (מתוך שם הקובץ)\n`;
              }
              
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

        excelContent += `\n📊 סיכום כללי (${groupTag}${fullCycleTag} ${groupName}):\n`;
        excelContent += `• סה"כ חניכים: ${totalStudents}\n`;
        excelContent += `• קבוצה: ${groupName}\n`;
        excelContent += `• תג קבוצה להבדלה: ${groupTag}\n`;
        if (cycleInfo || yearInfo) {
          excelContent += `• מחזור/תקופה: ${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}\n`;
          excelContent += `• תג מחזור להבדלה: ${fullCycleTag}\n`;
          excelContent += `• 🔴 מקור המחזור: שם הקובץ בלבד (לא מתוך הנתונים וגם לא מתוך תאריך ההעלאה!)\n`;
        }
        excelContent += `• מספר גיליונות: ${workbook.SheetNames.length}\n`;
        excelContent += `\n⚠️ חשוב: כל חניך בקובץ זה שייך ל-${groupTag}${fullCycleTag} (${groupName}${cycleInfo ? ' ' + cycleInfo : ''})\n`;

        const fileKey = `file:${Date.now()}:${fileName}`;
        await kv.put(fileKey, cleanText(excelContent), { expirationTtl: 60 * 60 * 24 * 7 });

        let successMsg = `✅ קובץ Excel נשמר בהצלחה!\n\n📊 סיכום:\n• קבוצה: **${groupName}** (${groupTag})\n• סה"כ חניכים: ${totalStudents}\n• גיליונות: ${workbook.SheetNames.join(', ')}\n`;
        
        if (cycleInfo || yearInfo) {
          successMsg += `• מחזור/תקופה: **${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}** (${fullCycleTag})\n`;
          successMsg += `• 🔴 המחזור זוהה משם הקובץ בלבד (לא מתאריך ההעלאה)!\n`;
        } else {
          successMsg += `⚠️ ⚠️ לא זוהה מחזור בשם הקובץ!\n`;
        }
        
        successMsg += `\n🏷️ כל חניך תויג בקבוצתו ובמחזורו!\n\nעכשיו תוכל לשאול בביטחון!`;
        
        return Response.json({ reply: successMsg });

      } catch (excelError) {
        console.error("Error parsing Excel:", excelError);
        return Response.json({ reply: "❌ שגיאה בקריאת קובץ Excel:\n" + excelError.message });
      }
    } else {
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