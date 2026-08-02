function cleanText(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\uFEFF\u200B-\u200D\uFFFD]/g, '')
    .trim();
}

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
        
        // קריאה של הקובץ כ-ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // קריאת ה-Excel
        const workbook = XLSX.read(uint8Array, { type: 'array' });
        
        // ========================================
        // 🔴 זיהוי קבוצה - משם הקובץ בלבד
        // ========================================
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
        
        // ========================================
        // 🔴 חלץ את החלק הרלוונטי (לפני התאריך!)
        // זה הסוד - מסננים את התאריך של ההעלאה
        // ========================================
        let relevantPart = fileName.toLowerCase();
        
        // הסר תאריכים בפורמט _DD-MM-YYYY
        relevantPart = relevantPart.replace(/_\d{2}-\d{2}-\d{4}/, '');
        relevantPart = relevantPart.replace(/_\d{2}\.\d{2}\.\d{4}/, '');
        
        // הסר סיומות קובץ
        relevantPart = relevantPart.replace(/\.(xlsx|xls|csv|json|txt)$/g, '');
        
        // ========================================
        // 🔴 זיהוי מחזור - משם הקובץ בלבד!
        // ========================================
        let cycleInfo = '';
        let cycleTag = '';
        
        // סדר חיפוש בחלק הרלוונטי בלבד!
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
        else if (relevantPart.includes('_מאי_') || relevantPart.includes(' מאי ') ||
                 relevantPart.includes('-מאי-') || relevantPart.includes('_מאי')) {
          cycleInfo = 'מאי';
          cycleTag = '[מאי]';
        }
        else if (relevantPart.includes('_יול_') || relevantPart.includes(' יול ') ||
                 relevantPart.includes('-יול-') || relevantPart.includes('יולי')) {
          cycleInfo = 'יולי';
          cycleTag = '[יול]';
        }
        else if (relevantPart.includes('_אוג_') || relevantPart.includes(' אוג ') ||
                 relevantPart.includes('-אוג-') || relevantPart.includes('אוגוסט')) {
          cycleInfo = 'אוגוסט';
          cycleTag = '[אוג]';
        }
        else if (relevantPart.includes('_ספ_') || relevantPart.includes(' ספ ') ||
                 relevantPart.includes('-ספ-') || relevantPart.includes('ספטמבר')) {
          cycleInfo = 'ספטמבר';
          cycleTag = '[ספ]';
        }
        else if (relevantPart.includes('_אוק_') || relevantPart.includes(' אוק ') ||
                 relevantPart.includes('-אוק-') || relevantPart.includes('אוקטובר')) {
          cycleInfo = 'אוקטובר';
          cycleTag = '[אוק]';
        }
        else if (relevantPart.includes('_דצ_') || relevantPart.includes(' דצ ') ||
                 relevantPart.includes('-דצ-') || relevantPart.includes('דצמבר')) {
          cycleInfo = 'דצמבר';
          cycleTag = '[דצ]';
        }
        
        // ========================================
        // 🔴 זיהוי שנה - משם הקובץ בלבד, בחלק הרלוונטי!
        // ========================================
        let yearInfo = '';
        
        // חפש שנה רק בחלק הרלוונטי (לאחר הסרת התאריך)
        if (relevantPart.includes('2025')) {
          yearInfo = '2025';
        } else if (relevantPart.includes('2026')) {
          yearInfo = '2026';
        }
        // חפש "25" או "26" בצורה בטוחה (עם מפרידים)
        else if (relevantPart.match(/[\s_-]25[\s_\.]|^25[\s_\.]|[\s_-]25$|^25$/)) {
          yearInfo = '2025';
        } else if (relevantPart.match(/[\s_-]26[\s_\.]|^26[\s_\.]|[\s_-]26$|^26$/)) {
          yearInfo = '2026';
        }
        
        // בנה תוגי מחזור מלא
        let fullCycleTag = '';
        if (cycleInfo && yearInfo) {
          fullCycleTag = `${cycleTag}${yearInfo.substring(2)}`;
        } else if (cycleInfo) {
          fullCycleTag = cycleTag;
        } else if (yearInfo) {
          fullCycleTag = `[${yearInfo}]`;
        }
        
        // ========================================
        // בדיקת תקינות - חזק!
        // ========================================
        console.log(`✅ שם הקובץ: ${fileName}`);
        console.log(`✅ חלק רלוונטי (ללא תאריך העלאה): ${relevantPart}`);
        console.log(`✅ זוהה קבוצה: ${groupTag} ${groupName}`);
        console.log(`✅ זוהה מחזור: ${fullCycleTag} ${cycleInfo} ${yearInfo}`);
        
        // קריאה של כל גיליונות העבודה
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
        excelContent += `✅ זיהוי מחזור ממשם הקובץ בלבד (לא מתוך הנתונים! ולא מתוך תאריך ההעלאה!)\n`;
        excelContent += `⚠️ חשוב: כל חניך בקבוצה זו יתויג כ-${groupTag}${fullCycleTag}\n`;
        excelContent += `${'='.repeat(100)}\n\n`;
        
        let totalStudents = 0;
        
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          
          // קריאה כמו array
          const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // זיהוי שורת ה-headers
          let headerRowIdx = 0;
          for (let i = 0; i < Math.min(5, allData.length); i++) {
            const row = allData[i];
            if (row && row.join('|').toLowerCase().includes('משתמש')) {
              headerRowIdx = i;
              break;
            }
          }
          
          const headers = allData[headerRowIdx] || [];
          
          // דלג על שורות metadata
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
          
          // הדפסת כל חניך עם תגי מחזור מהשם!
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
              // תגים מהשם - זה קדוש!
              excelContent += `\n${groupTag} ${fullCycleTag} 👤 חניך ${totalStudents + index + 1}:\n`;
              
              // הוסף את תגי הקבוצה והמחזור
              excelContent += `  • קבוצה: ${groupName}\n`;
              excelContent += `  • תג קבוצה: ${groupTag}\n`;
              if (cycleInfo || yearInfo) {
                excelContent += `  • מחזור: ${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}\n`;
                excelContent += `  • תג מחזור: ${fullCycleTag} (מתוך שם הקובץ בלבד)\n`;
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
          excelContent += `• 🔴 מקור המחזור: שם הקובץ בלבד (לא מתוך הנתונים! ולא מתוך תאריך ההעלאה!)\n`;
        }
        excelContent += `• מספר גיליונות: ${workbook.SheetNames.length}\n`;
        excelContent += `\n⚠️ חשוב: כל חניך בקובץ זה שייך ל-${groupTag}${fullCycleTag} (${groupName}${cycleInfo ? ' ' + cycleInfo : ''})\n`;

        // שמירה ב-KV מנוקה
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
      // לקבצים רגילים
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