export async function handleFileUpload(request, env) {
  const kv = env.CHAT_KV;
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) return Response.json({ reply: "לא נשלח קובץ" });

    const fileName = file.name;

    // בדיקה אם זה קובץ Excel
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      try {
        const XLSX = await import('xlsx');
        
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(uint8Array, { type: 'array' });
        
        // ========================================
        // זיהוי קבוצה - משם הקובץ בלבד
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
        // חלץ את החלק הרלוונטי (לפני התאריך!)
        // ========================================
        let relevantPart = fileName.toLowerCase();
        relevantPart = relevantPart.replace(/_\d{2}-\d{2}-\d{4}/, '');
        relevantPart = relevantPart.replace(/_\d{2}\.\d{2}\.\d{4}/, '');
        relevantPart = relevantPart.replace(/\.(xlsx|xls|csv|json|txt)$/g, '');
        
        // ========================================
        // זיהוי מחזור - משם הקובץ בלבד!
        // ========================================
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
        
        // ========================================
        // זיהוי שנה - משם הקובץ בלבד!
        // ========================================
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
        let classesSummary = {}; // עקוב אחרי מחלקות
        
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // ✅ שיפור 1: בדיקה מדויקת של headers
          // headers תמיד בשורה 1, עם "שם משתמש" בעמודה C (index 2)
          const headers = allData[0] || [];
          
          // ✅ שיפור 2: סינון עמודות A ו-B (ריקות)
          // בנו headers רק מעמודה C ומעבר
          const relevantHeaders = headers.slice(2);
          
          console.log(`📋 גיליון: "${sheetName}", כמות headers: ${relevantHeaders.length}`);
          
          // ✅ שיפור 3: עקוב אחרי מחלקות בעת קריאה
          let currentClass = '';
          let classStudentCount = 0;
          
          for (let rowIdx = 2; rowIdx < allData.length; rowIdx++) {
            const row = allData[rowIdx];
            
            // בדוק אם זה סימן מחלקה (בעמודה A)
            if (row[0] && row[0].toString().includes('מחלקה')) {
              currentClass = row[0].toString().trim();
              classStudentCount = 0;
              continue;
            }
            
            // ✅ שיפור 4: דלג על שורות metadata בעמודה A
            // בדוק אם עמודה A מכילה מטדטא ועמודה C ריקה
            if (row[0] && !row[2]) {
              const colAstr = row[0].toString().toLowerCase();
              if (colAstr.includes('סה"כ') || 
                  colAstr.includes('מספר החניכים') ||
                  colAstr.includes('משקל') ||
                  colAstr.includes('%')) {
                continue;
              }
            }
            
            // בדוק אם זה חניך (יש מייל בעמודה C)
            if (!row[2] || !row[2].toString().includes('@')) {
              continue;
            }
            
            // ✅ בנו את נתוני החניך
            const studentData = {};
            relevantHeaders.forEach((header, idx) => {
              if (header) {
                const value = row[idx + 2]; // +2 כי דלגנו על עמודות A ו-B
                if (value !== undefined && value !== null && value !== '') {
                  studentData[header] = value;
                }
              }
            });
            
            if (Object.keys(studentData).length > 0) {
              classStudentCount++;
              
              // הדפס חניך עם תגי מחזור
              excelContent += `\n${groupTag}${fullCycleTag} 👤 חניך ${totalStudents + 1}:\n`;
              
              // הוסף מידע קבוצה ומחלקה
              excelContent += `  • קבוצה: ${groupName}\n`;
              excelContent += `  • תג קבוצה: ${groupTag}\n`;
              if (currentClass) {
                excelContent += `  • מחלקה: ${currentClass}\n`;
              }
              if (cycleInfo || yearInfo) {
                excelContent += `  • מחזור: ${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}\n`;
                excelContent += `  • תג מחזור: ${fullCycleTag}\n`;
              }
              
              // הדפס ציונים (עד 15 פריטים)
              Object.entries(studentData).slice(0, 15).forEach(([key, value]) => {
                excelContent += `  • ${key}: ${value}\n`;
              });
              
              if (Object.keys(studentData).length > 15) {
                excelContent += `  • ... (עוד ${Object.keys(studentData).length - 15} פריטים)\n`;
              }
              
              totalStudents++;
            }
          }
          
          // עדכן סיכום מחלקות
          if (currentClass) {
            classesSummary[currentClass] = classStudentCount;
          }
          
          excelContent += '\n' + `${'='.repeat(100)}\n\n`;
        });

        // סיכום סופי
        excelContent += `\n📊 סיכום כללי (${groupTag}${fullCycleTag} ${groupName}):\n`;
        excelContent += `• סה"כ חניכים: ${totalStudents}\n`;
        excelContent += `• קבוצה: ${groupName}\n`;
        excelContent += `• תג קבוצה להבדלה: ${groupTag}\n`;
        
        if (Object.keys(classesSummary).length > 0) {
          excelContent += `• מחלקות:\n`;
          Object.entries(classesSummary).forEach(([className, count]) => {
            excelContent += `  - ${className}: ${count} חניכים\n`;
          });
        }
        
        if (cycleInfo || yearInfo) {
          excelContent += `• מחזור/תקופה: ${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}\n`;
          excelContent += `• תג מחזור להבדלה: ${fullCycleTag}\n`;
          excelContent += `• 🔴 מקור המחזור: שם הקובץ בלבד (לא מתוך הנתונים וגם לא מתוך תאריך ההעלאה!)\n`;
        }
        excelContent += `• מספר גיליונות: ${workbook.SheetNames.length}\n`;
        excelContent += `\n⚠️ חשוב: כל חניך בקובץ זה שייך ל-${groupTag}${fullCycleTag} (${groupName}${cycleInfo ? ' ' + cycleInfo : ''})\n`;

        // שמירה ב-KV
        const fileKey = `file:${Date.now()}:${fileName}`;
        await kv.put(fileKey, excelContent, { expirationTtl: 60 * 60 * 24 * 7 });

        let successMsg = `✅ קובץ Excel נשמר בהצלחה!\n\n📊 סיכום:\n• קבוצה: **${groupName}** (${groupTag})\n• סה"כ חניכים: ${totalStudents}\n`;
        
        if (Object.keys(classesSummary).length > 0) {
          successMsg += `• מחלקות:\n`;
          Object.entries(classesSummary).forEach(([className, count]) => {
            successMsg += `  - ${className}: ${count} חניכים\n`;
          });
        }
        
        successMsg += `• גיליונות: ${workbook.SheetNames.join(', ')}\n`;
        
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