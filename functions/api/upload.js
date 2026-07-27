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
        // 🔴 זיהוי מחזור - משם הקובץ בלבד!
        // זה הוא קדוש - לא קורא מתוך הנתונים!
        // ========================================
        let cycleInfo = '';
        let cycleTag = '';
        
        const lowerFileName = fileName.toLowerCase();
        
        // סדר חיפוש - בדיקה ממוקדת וחכמה
        // 1. נובמבר - חפש "נוב" בצורה ברורה
        if (lowerFileName.includes('_נוב_') || lowerFileName.includes(' נוב ') || 
            lowerFileName.includes('-נוב-') || lowerFileName.includes('נוב_') ||
            lowerFileName.includes('_נוב') || lowerFileName.includes('נוב ')) {
          cycleInfo = 'נובמבר';
          cycleTag = '[נוב]';
        }
        // 2. מרץ
        else if (lowerFileName.includes('_מר_') || lowerFileName.includes(' מר ') ||
                 lowerFileName.includes('-מר-') || lowerFileName.includes('מרץ')) {
          cycleInfo = 'מרץ';
          cycleTag = '[מר]';
        }
        // 3. יוני - בדיקה זהירה מאוד!
        else if (lowerFileName.includes('_יון_') || lowerFileName.includes(' יון ') ||
                 lowerFileName.includes('-יון-') || lowerFileName.includes('יוני')) {
          cycleInfo = 'יוני';
          cycleTag = '[יון]';
        }
        // 4. ינואר
        else if (lowerFileName.includes('_ין_') || lowerFileName.includes(' ין ') ||
                 lowerFileName.includes('-ין-') || lowerFileName.includes('ינואר')) {
          cycleInfo = 'ינואר';
          cycleTag = '[ין]';
        }
        // 5. פברואר
        else if (lowerFileName.includes('_פב_') || lowerFileName.includes(' פב ') ||
                 lowerFileName.includes('-פב-') || lowerFileName.includes('פברואר')) {
          cycleInfo = 'פברואר';
          cycleTag = '[פב]';
        }
        // 6. אפריל
        else if (lowerFileName.includes('_אפ_') || lowerFileName.includes(' אפ ') ||
                 lowerFileName.includes('-אפ-') || lowerFileName.includes('אפריל')) {
          cycleInfo = 'אפריל';
          cycleTag = '[אפ]';
        }
        // 7. מאי
        else if (lowerFileName.includes('_מאי_') || lowerFileName.includes(' מאי ') ||
                 lowerFileName.includes('-מאי-') || lowerFileName.includes('_מאי')) {
          cycleInfo = 'מאי';
          cycleTag = '[מאי]';
        }
        // 8. יולי
        else if (lowerFileName.includes('_יול_') || lowerFileName.includes(' יול ') ||
                 lowerFileName.includes('-יול-') || lowerFileName.includes('יולי')) {
          cycleInfo = 'יולי';
          cycleTag = '[יול]';
        }
        // 9. אוגוסט
        else if (lowerFileName.includes('_אוג_') || lowerFileName.includes(' אוג ') ||
                 lowerFileName.includes('-אוג-') || lowerFileName.includes('אוגוסט')) {
          cycleInfo = 'אוגוסט';
          cycleTag = '[אוג]';
        }
        // 10. ספטמבר
        else if (lowerFileName.includes('_ספ_') || lowerFileName.includes(' ספ ') ||
                 lowerFileName.includes('-ספ-') || lowerFileName.includes('ספטמבר')) {
          cycleInfo = 'ספטמבר';
          cycleTag = '[ספ]';
        }
        // 11. אוקטובר
        else if (lowerFileName.includes('_אוק_') || lowerFileName.includes(' אוק ') ||
                 lowerFileName.includes('-אוק-') || lowerFileName.includes('אוקטובר')) {
          cycleInfo = 'אוקטובר';
          cycleTag = '[אוק]';
        }
        // 12. דצמבר
        else if (lowerFileName.includes('_דצ_') || lowerFileName.includes(' דצ ') ||
                 lowerFileName.includes('-דצ-') || lowerFileName.includes('דצמבר')) {
          cycleInfo = 'דצמבר';
          cycleTag = '[דצ]';
        }
        
        // ========================================
        // זיהוי שנה - משם הקובץ בלבד
        // ========================================
        let yearInfo = '';
        
        // חפש "2025", "2026"
        if (fileName.includes('2025')) {
          yearInfo = '2025';
        } else if (fileName.includes('2026')) {
          yearInfo = '2026';
        }
        // חפש "25", "26" (אבל בזהירות)
        else if (fileName.includes('_25_') || fileName.includes('-25-') || 
                 fileName.includes(' 25 ') || fileName.includes('_25')) {
          yearInfo = '2025';
        } else if (fileName.includes('_26_') || fileName.includes('-26-') || 
                   fileName.includes(' 26 ') || fileName.includes('_26')) {
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
        excelContent += `✅ זיהוי מחזור ממשם הקובץ בלבד (לא מתוך הנתונים!)\n`;
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
          excelContent += `• 🔴 מקור המחזור: שם הקובץ בלבד (לא מתוך הנתונים!)\n`;
        }
        excelContent += `• מספר גיליונות: ${workbook.SheetNames.length}\n`;
        excelContent += `\n⚠️ חשוב: כל חניך בקובץ זה שייך ל-${groupTag}${fullCycleTag} (${groupName}${cycleInfo ? ' ' + cycleInfo : ''})\n`;

        // שמירה ב-KV
        const fileKey = `file:${Date.now()}:${fileName}`;
        await kv.put(fileKey, excelContent, { expirationTtl: 60 * 60 * 24 * 7 });

        let successMsg = `✅ קובץ Excel נשמר בהצלחה!\n\n📊 סיכום:\n• קבוצה: **${groupName}** (${groupTag})\n• סה"כ חניכים: ${totalStudents}\n• גיליונות: ${workbook.SheetNames.join(', ')}\n`;
        
        if (cycleInfo || yearInfo) {
          successMsg += `• מחזור/תקופה: **${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}** (${fullCycleTag})\n`;
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