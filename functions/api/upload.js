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
        // זיהוי קבוצה
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
        // 🔴 זיהוי מחזור (חודש) - משם הקובץ בלבד
        // ========================================
        let cycleInfo = '';
        let cycleTag = '';
        let monthNum = 0;
        
        const lowerFileName = fileName.toLowerCase();
        
        // מפת חודשים - בדיקה ממוקדת וחכמה
        const monthsMap = [
          { names: ['_נוב_', ' נוב ', '-נוב-', 'נוב_', '_נוב'], month: 'נובמבר', tag: '[נוב]', num: 11 },
          { names: ['_מר_', ' מר ', '-מר-', 'מרץ'], month: 'מרץ', tag: '[מר]', num: 3 },
          { names: ['_יון_', ' יון ', '-יון-', 'יוני'], month: 'יוני', tag: '[יון]', num: 6 },
          { names: ['_ין_', ' ין ', '-ין-', 'ינואר'], month: 'ינואר', tag: '[ין]', num: 1 },
          { names: ['_פב_', ' פב ', '-פב-', 'פברואר'], month: 'פברואר', tag: '[פב]', num: 2 },
          { names: ['_אפ_', ' אפ ', '-אפ-', 'אפריל'], month: 'אפריל', tag: '[אפ]', num: 4 },
          { names: ['_מאי_', ' מאי ', '-מאי-', '_מאי'], month: 'מאי', tag: '[מאי]', num: 5 },
          { names: ['_יול_', ' יול ', '-יול-', 'יולי'], month: 'יולי', tag: '[יול]', num: 7 },
          { names: ['_אוג_', ' אוג ', '-אוג-', 'אוגוסט'], month: 'אוגוסט', tag: '[אוג]', num: 8 },
          { names: ['_ספ_', ' ספ ', '-ספ-', 'ספטמבר'], month: 'ספטמבר', tag: '[ספ]', num: 9 },
          { names: ['_אוק_', ' אוק ', '-אוק-', 'אוקטובר'], month: 'אוקטובר', tag: '[אוק]', num: 10 },
          { names: ['_דצ_', ' דצ ', '-דצ-', 'דצמבר'], month: 'דצמבר', tag: '[דצ]', num: 12 },
        ];
        
        // חפש חודש
        for (const monthPattern of monthsMap) {
          for (const name of monthPattern.names) {
            if (lowerFileName.includes(name)) {
              cycleInfo = monthPattern.month;
              cycleTag = monthPattern.tag;
              monthNum = monthPattern.num;
              break;
            }
          }
          if (cycleInfo) break;
        }
        
        // ========================================
        // 🔴 זיהוי שנה - חכם וגמיש!
        // ========================================
        let yearInfo = '';
        let yearShort = '';
        
        // אסטרטגיה 1: חפש שנה מלאה (2020-2099)
        const fullYearMatch = fileName.match(/20\d{2}|19\d{2}/);
        if (fullYearMatch) {
          yearInfo = fullYearMatch[0];
          yearShort = yearInfo.substring(2);
        }
        
        // אסטרטגיה 2: אם לא מצא, חפש שנה בן 2 ספרות (אבל בזהירות!)
        // בדוק רק אם יש חודש (כדי להבדיל משנות כתיבה)
        if (!yearInfo && cycleInfo) {
          // חפש צמוד לחודש: "נוב 25", "מר_26", וכו'
          const monthShort = cycleTag.replace(/[\[\]]/g, ''); // הוציא את הסוגריים
          
          // בדוק דפוסים שונים
          const yearPatterns = [
            new RegExp(`${monthShort}\\s+(\\d{2})(?!\\d)`, 'i'),  // "נוב 25"
            new RegExp(`${monthShort}_(\\d{2})(?!\\d)`, 'i'),      // "נוב_25"
            new RegExp(`${monthShort}-(\\d{2})(?!\\d)`, 'i'),      // "נוב-25"
          ];
          
          for (const pattern of yearPatterns) {
            const match = fileName.match(pattern);
            if (match && match[1]) {
              yearShort = match[1];
              // נרמל ל-2000+ או 1900+ בהתאם
              const yearNum = parseInt(yearShort);
              if (yearNum > 30) {
                yearInfo = '19' + yearShort;
              } else {
                yearInfo = '20' + yearShort;
              }
              break;
            }
          }
        }
        
        // ========================================
        // בנה תוגי מחזור מלא
        // ========================================
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
        console.log(`✅ זוהה קבוצה: ${groupTag} ${groupName}`);
        console.log(`✅ זוהה חודש: ${cycleInfo} (${monthNum})`);
        console.log(`✅ זוהה שנה: ${yearInfo}`);
        console.log(`✅ תג מחזור סופי: ${fullCycleTag}`);
        
        // קריאה של כל גיליונות העבודה
        let excelContent = `📊 **שם הקובץ: ${fileName}**\n`;
        excelContent += `תאריך העלאה: ${new Date().toLocaleString('he-IL')}\n`;
        excelContent += `${'='.repeat(100)}\n\n`;
        
        excelContent += `📌 קבוצה/יחידה: **${groupName}** (תג: ${groupTag})\n`;
        if (cycleInfo || yearInfo) {
          excelContent += `📅 מחזור/תקופה: **${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}** (תג: ${fullCycleTag})\n`;
          excelContent += `🔢 מספר חודש: ${monthNum}\n`;
        } else {
          excelContent += `⚠️ ⚠️ ⚠️ לא זוהה מחזור בשם הקובץ!\n`;
        }
        excelContent += `${'='.repeat(100)}\n\n`;
        excelContent += `✅ זיהוי מחזור וחודש ושנה ממשם הקובץ בלבד (לא מתוך הנתונים!)\n`;
        excelContent += `✅ כל שנה מ-1900 עד 2099 זוהה אוטומטית!\n`;
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
          excelContent += `עמודות ראשיות: ${headers.slice(0, 10).filter(h => h).join(' | ')} ...\n\n`;
          
          // הדפסת כל חניך עם תגי מחזור מהשם!
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
              // תגים מהשם - זה קדוש!
              excelContent += `\n${groupTag} ${fullCycleTag} 👤 חניך ${totalStudents + index + 1}:\n`;
              
              // הוסף את תגי הקבוצה והמחזור
              excelContent += `  • קבוצה: ${groupName}\n`;
              excelContent += `  • תג קבוצה: ${groupTag}\n`;
              if (cycleInfo || yearInfo) {
                excelContent += `  • חודש: ${cycleInfo}${monthNum ? ' (' + monthNum + ')' : ''}\n`;
                excelContent += `  • שנה: ${yearInfo}\n`;
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
          excelContent += `• חודש: ${cycleInfo}${monthNum ? ' (' + monthNum + ')' : ''}\n`;
          excelContent += `• שנה: ${yearInfo}\n`;
          excelContent += `• תג מחזור להבדלה: ${fullCycleTag}\n`;
          excelContent += `• 🔴 מקור המחזור: שם הקובץ בלבד (לא מתוך הנתונים או תאריכי יצירה!)\n`;
        }
        excelContent += `• מספר גיליונות: ${workbook.SheetNames.length}\n`;
        excelContent += `\n⚠️ חשוב: כל חניך בקובץ זה שייך ל-${groupTag}${fullCycleTag} (${groupName}${cycleInfo ? ' ' + cycleInfo : ''})\n`;

        // שמירה ב-KV
        const fileKey = `file:${Date.now()}:${fileName}`;
        await kv.put(fileKey, excelContent, { expirationTtl: 60 * 60 * 24 * 7 });

        let successMsg = `✅ קובץ Excel נשמר בהצלחה!\n\n📊 סיכום:\n• קבוצה: **${groupName}** (${groupTag})\n• סה"כ חניכים: ${totalStudents}\n• גיליונות: ${workbook.SheetNames.join(', ')}\n`;
        
        if (cycleInfo || yearInfo) {
          successMsg += `• חודש: **${cycleInfo}**${monthNum ? ' (חודש ' + monthNum + ')' : ''}\n`;
          successMsg += `• שנה: **${yearInfo}**\n`;
          successMsg += `• מחזור: **${fullCycleTag}**\n`;
          successMsg += `• 🔴 המחזור זוהה משם הקובץ בלבד!\n`;
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