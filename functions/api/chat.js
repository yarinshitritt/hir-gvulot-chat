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
          
          // זיהוי הקבוצה
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
          
          // זיהוי המחזור/תקופה
          let cycleInfo = '';
          let cycleTag = '';
          
          const monthsHebrew = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 
                               'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
          const monthsShort = ['ין', 'פב', 'מר', 'אפ', 'מאי', 'יון', 'יול', 'אוג', 'ספ', 'אוק', 'נוב', 'דצ'];
          
          for (let i = 0; i < monthsHebrew.length; i++) {
            if (fileName.toLowerCase().includes(monthsHebrew[i])) {
              cycleInfo = monthsHebrew[i];
              cycleTag = `[${monthsHebrew[i].substring(0, 3)}]`;
              break;
            }
          }
          
          let yearInfo = '';
          const yearMatch = fileName.match(/202[0-9]|25|26/);
          if (yearMatch) {
            yearInfo = yearMatch[0];
            if (yearInfo === '25') yearInfo = '2025';
            if (yearInfo === '26') yearInfo = '2026';
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
      fullContext += `⚠️ חשוב: כל חניך כולל תג קבוצה ותג מחזור!\n`;
      fullContext += `לדוגמה: [קרקל][נוב]25 חניך X → משמעות: חניך X של קרקל, נובמבר 2025\n`;
      fullContext += `          [ברדלס][מר]25 חניך Y → משמעות: חניך Y של ברדלס, מרץ 2025\n`;
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
        fullContext += `⚠️ זכור: כל חניך בחלק זה שייך ל-${info.groupTag}${info.cycleTag || ''}\n`;
        
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
          parts: [{ text: "הבנתי את ההנחיות תוך כדי שמירה קפדנית על התגים של הקבוצות והמחזורים. כל חניך כולל תג קבוצה ([קרקל], [ברדלס], וכו') וגם תג מחזור ([נוב]25, [מר]25, וכו'). אני לא אערבב בינהם ולא אחשוב שחניך של קבוצה או מחזור אחד שייך לקבוצה או מחזור אחר. אם חניך X מתויג [קרקל][נוב]25, הוא תמיד יהיה של קרקל בנובמבר 2025." }]
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
        
        // זיהוי קבוצה
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
        
        // זיהוי מחזור
        let cycleInfo = '';
        let cycleTag = '';
        const monthsHebrew = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 
                             'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        
        for (let i = 0; i < monthsHebrew.length; i++) {
          if (fileName.toLowerCase().includes(monthsHebrew[i])) {
            cycleInfo = monthsHebrew[i];
            cycleTag = `[${monthsHebrew[i].substring(0, 3)}]`;
            break;
          }
        }
        
        let yearInfo = '';
        const yearMatch = fileName.match(/202[0-9]|25|26/);
        if (yearMatch) {
          yearInfo = yearMatch[0];
          if (yearInfo === '25') yearInfo = '2025';
          if (yearInfo === '26') yearInfo = '2026';
        }
        
        let fullCycleTag = '';
        if (cycleInfo && yearInfo) {
          fullCycleTag = `${cycleTag}${yearInfo.substring(2)}`;
        } else if (cycleInfo) {
          fullCycleTag = cycleTag;
        } else if (yearInfo) {
          fullCycleTag = `[${yearInfo}]`;
        }
        
        let excelContent = `📊 **שם הקובץ: ${fileName}**\n`;
        excelContent += `תאריך העלאה: ${new Date().toLocaleString('he-IL')}\n`;
        excelContent += `${'='.repeat(100)}\n\n`;
        
        excelContent += `📌 קבוצה/יחידה: **${groupName}** (תג: ${groupTag})\n`;
        if (cycleInfo || yearInfo) {
          excelContent += `📅 מחזור/תקופה: **${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}** (תג: ${fullCycleTag})\n`;
        }
        excelContent += `${'='.repeat(100)}\n\n`;
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
          excelContent += `עמודות ראשיות: ${headers.slice(0, 10).filter(h => h).join(' | ')} ...\n\n`;
          
          validStudents.forEach((row, index) => {
            const studentData = {};
            headers.forEach((header, colIdx) => {
              if (header) {
                const value = row[colIdx];
                if (value !== undefined && value !== null && value !== '') {
                  studentData[header] = value;
                }
              }
            });
            
            if (Object.keys(studentData).length > 0) {
              excelContent += `\n${groupTag} ${fullCycleTag} 👤 חניך ${totalStudents + index + 1}:\n`;
              
              excelContent += `  • קבוצה: ${groupName}\n`;
              excelContent += `  • תג קבוצה: ${groupTag}\n`;
              if (cycleInfo || yearInfo) {
                excelContent += `  • מחזור: ${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}\n`;
                excelContent += `  • תג מחזור: ${fullCycleTag}\n`;
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
        }
        excelContent += `• מספר גיליונות: ${workbook.SheetNames.length}\n`;
        excelContent += `\n⚠️ חשוב: כל חניך בקובץ זה שייך ל-${groupTag}${fullCycleTag} (${groupName}${cycleInfo ? ' ' + cycleInfo : ''})\n`;

        const fileKey = `file:${Date.now()}:${fileName}`;
        await kv.put(fileKey, excelContent, { expirationTtl: 60 * 60 * 24 * 7 });

        let successMsg = `✅ קובץ Excel נשמר בהצלחה!\n\n📊 סיכום:\n• קבוצה: **${groupName}** (${groupTag})\n• סה"כ חניכים: ${totalStudents}\n• גיליונות: ${workbook.SheetNames.join(', ')}\n`;
        
        if (cycleInfo || yearInfo) {
          successMsg += `• מחזור/תקופה: **${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}** (${fullCycleTag})\n`;
        }
        
        successMsg += `\n🏷️ כל חניך תויג בקבוצתו ובמחזורו - למניעת בלבול!\n\nעכשיו תוכל לשאול בביטחון!`;
        
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