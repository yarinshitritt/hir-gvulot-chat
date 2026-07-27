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
        
        // זיהוי הקבוצה/יחידה לפי שם הקובץ
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
        
        // זיהוי המחזור/תקופה לפי שם הקובץ
        let cycleInfo = '';
        let cycleTag = '';
        
        // חודשים בעברית
        const monthsHebrew = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 
                             'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        const monthsEnglish = ['january', 'february', 'march', 'april', 'may', 'june',
                              'july', 'august', 'september', 'october', 'november', 'december'];
        const monthsShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        
        // חפש חודשים
        for (let i = 0; i < monthsHebrew.length; i++) {
          if (fileName.toLowerCase().includes(monthsHebrew[i])) {
            cycleInfo = monthsHebrew[i];
            cycleTag = `[${monthsHebrew[i].substring(0, 3)}]`;
            break;
          }
        }
        
        if (!cycleInfo) {
          for (let i = 0; i < monthsEnglish.length; i++) {
            if (fileName.toLowerCase().includes(monthsEnglish[i]) || fileName.toLowerCase().includes(monthsShort[i])) {
              cycleInfo = monthsEnglish[i];
              cycleTag = `[${monthsShort[i]}]`;
              break;
            }
          }
        }
        
        // חפש שנה
        let yearInfo = '';
        const yearMatch = fileName.match(/202[0-9]|25|26/);
        if (yearMatch) {
          yearInfo = yearMatch[0];
          if (yearInfo === '25') yearInfo = '2025';
          if (yearInfo === '26') yearInfo = '2026';
        }
        
        // חפש "מחזור", "תקופה", "סיבוב"
        let cycleType = '';
        if (fileName.toLowerCase().includes('מחזור')) cycleType = 'מחזור';
        else if (fileName.toLowerCase().includes('תקופה')) cycleType = 'תקופה';
        else if (fileName.toLowerCase().includes('סיבוב')) cycleType = 'סיבוב';
        
        // בנה תוגי מחזור מלא
        let fullCycleTag = '';
        if (cycleInfo && yearInfo) {
          fullCycleTag = `${cycleTag}${yearInfo.substring(2)}`;
        } else if (cycleInfo) {
          fullCycleTag = cycleTag;
        } else if (yearInfo) {
          fullCycleTag = `[${yearInfo}]`;
        }
        
        // קריאה של כל גיליונות העבודה
        let excelContent = `📊 **שם הקובץ: ${fileName}**\n`;
        excelContent += `תאריך העלאה: ${new Date().toLocaleString('he-IL')}\n`;
        excelContent += `${'='.repeat(100)}\n\n`;
        
        excelContent += `📌 קבוצה/יחידה: **${groupName}** (תג: ${groupTag})\n`;
        if (cycleInfo || yearInfo) {
          excelContent += `📅 מחזור/תקופה: **${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}** (תג: ${fullCycleTag})\n`;
        }
        excelContent += `${'='.repeat(100)}\n\n`;
        excelContent += `⚠️ חשוב: כל חניך בקבוצה זו יתויג כ-${groupTag} ${fullCycleTag}\n`;
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
          
          excelContent += `📋 גיליון: "${sheetName}" (קבוצה: ${groupTag}${fullCycleTag ? ' ' + fullCycleTag : ''})\n`;
          excelContent += `${'-'.repeat(100)}\n`;
          excelContent += `כמות החניכים: ${validStudents.length}\n`;
          excelContent += `עמודות ראשיות: ${headers.slice(0, 10).filter(h => h).join(' | ')} ...\n\n`;
          
          // הדפסת כל חניך עם תג קבוצה וחזקה תג מחזור!
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
              // תגים חזקים - קבוצה ומחזור
              excelContent += `\n${groupTag} ${fullCycleTag} 👤 חניך ${totalStudents + index + 1}:\n`;
              
              // הוסף את תגי הקבוצה והמחזור לנתונים
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

        excelContent += `\n📊 סיכום כללי (${groupTag}${fullCycleTag ? ' ' + fullCycleTag : ''} ${groupName}):\n`;
        excelContent += `• סה"כ חניכים: ${totalStudents}\n`;
        excelContent += `• קבוצה: ${groupName}\n`;
        excelContent += `• תג קבוצה להבדלה: ${groupTag}\n`;
        if (cycleInfo || yearInfo) {
          excelContent += `• מחזור/תקופה: ${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}\n`;
          excelContent += `• תג מחזור להבדלה: ${fullCycleTag}\n`;
        }
        excelContent += `• מספר גיליונות: ${workbook.SheetNames.length}\n`;
        excelContent += `\n⚠️ חשוב: כל חניך בקובץ זה שייך ל-${groupTag}${fullCycleTag ? ' ' + fullCycleTag : ''} (${groupName}${cycleInfo ? ' ' + cycleInfo : ''})\n`;

        // שמירה ב-KV
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