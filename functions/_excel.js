export function cleanText(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\uFEFF\u200B-\u200D\uFFFD]/g, '')
    .trim();
}

// זיהוי מבני גלובלי של שורת הכותרות - ללא שום מילה קשיחה מוגדרת מראש!
export function findHeaderRowIndexGlobal(allData) {
  if (!allData || allData.length === 0) return 0;
  
  let bestIdx = 0;
  let maxCellCount = 0;

  // סורק את 15 השורות הראשונות
  const limit = Math.min(15, allData.length);
  for (let i = 0; i < limit; i++) {
    const row = allData[i];
    if (!row || !Array.isArray(row)) continue;
    
    // סופר תאים שאינם ריקים
    const filledCells = row.filter(cell => cell !== null && cell !== undefined && cleanText(cell) !== '').length;
    
    // השורה הראשונה עם הכי הרבה תאים מלאים נבחרת ככותרת
    if (filledCells > maxCellCount) {
      maxCellCount = filledCells;
      bestIdx = i;
    }
  }
  
  return bestIdx;
}

export function extractHeaders(headerRow) {
  const headers = [];
  const seenHeaders = new Set();

  (headerRow || []).forEach((h, colIdx) => {
    let name = cleanText(h);
    if (!name) {
      name = `עמודה_${colIdx + 1}`;
    }
    let uniqueName = name;
    let counter = 1;
    while (seenHeaders.has(uniqueName)) {
      uniqueName = `${name}_(${counter++})`;
    }
    seenHeaders.add(uniqueName);
    headers[colIdx] = uniqueName;
  });

  return headers;
}

export function parseExcelWorkbookGlobal(workbook, fileName, XLSX) {
  const lowerFileName = fileName.toLowerCase();
  let relevantPart = lowerFileName;
  relevantPart = relevantPart.replace(/_\d{2}-\d{2}-\d{4}/g, '');
  relevantPart = relevantPart.replace(/_\d{2}\.\d{2}\.\d{4}/g, '');
  relevantPart = relevantPart.replace(/\.(xlsx|xls|csv|json|txt)$/g, '');

  // זיהוי קבוצה/יחידה משם הקובץ (במידה וקיים)
  let groupName = '';
  let groupTag = '';
  if (relevantPart.includes('קרקל')) { groupName = 'קרקל'; groupTag = '[קרקל]'; }
  else if (relevantPart.includes('ברדלס')) { groupName = 'ברדלס'; groupTag = '[ברדלס]'; }
  else if (relevantPart.includes('אריות')) { groupName = 'אריות'; groupTag = '[אריות]'; }
  else if (relevantPart.includes('פנטרה')) { groupName = 'פנטרה'; groupTag = '[פנטרה]'; }
  else if (relevantPart.includes('מתקדם')) { groupName = 'אימון מתקדם'; groupTag = '[מתקדם]'; }
  else if (relevantPart.includes('בסיסי')) { groupName = 'אימון בסיסי'; groupTag = '[בסיסי]'; }

  // זיהוי מחזור ושנה משם הקובץ (במידה וקיים)
  let cycleInfo = '';
  let cycleTag = '';
  if (relevantPart.includes('_נוב_') || relevantPart.includes(' נוב ') || relevantPart.includes('נוב_') || relevantPart.includes('_נוב') || relevantPart.includes('נוב ')) { cycleInfo = 'נובמבר'; cycleTag = '[נוב]'; }
  else if (relevantPart.includes('_מר_') || relevantPart.includes(' מר ') || relevantPart.includes('מרץ')) { cycleInfo = 'מרץ'; cycleTag = '[מר]'; }
  else if (relevantPart.includes('_יון_') || relevantPart.includes(' יון ') || relevantPart.includes('יוני')) { cycleInfo = 'יוני'; cycleTag = '[יון]'; }
  else if (relevantPart.includes('_ין_') || relevantPart.includes(' ין ') || relevantPart.includes('ינואר')) { cycleInfo = 'ינואר'; cycleTag = '[ין]'; }
  else if (relevantPart.includes('_פב_') || relevantPart.includes(' פב ') || relevantPart.includes('פברואר')) { cycleInfo = 'פברואר'; cycleTag = '[פב]'; }
  else if (relevantPart.includes('_אפ_') || relevantPart.includes(' אפ ') || relevantPart.includes('אפריל')) { cycleInfo = 'אפריל'; cycleTag = '[אפ]'; }
  else if (relevantPart.includes('_מאי_') || relevantPart.includes(' מאי ')) { cycleInfo = 'מאי'; cycleTag = '[מאי]'; }
  else if (relevantPart.includes('_יול_') || relevantPart.includes(' יול ') || relevantPart.includes('יולי')) { cycleInfo = 'יולי'; cycleTag = '[יול]'; }
  else if (relevantPart.includes('_אוג_') || relevantPart.includes(' אוג ') || relevantPart.includes('אוגוסט')) { cycleInfo = 'אוגוסט'; cycleTag = '[אוג]'; }
  else if (relevantPart.includes('_ספ_') || relevantPart.includes(' ספ ') || relevantPart.includes('ספטמבר')) { cycleInfo = 'ספטמבר'; cycleTag = '[ספ]'; }
  else if (relevantPart.includes('_אוק_') || relevantPart.includes(' אוק ') || relevantPart.includes('אוקטובר')) { cycleInfo = 'אוקטובר'; cycleTag = '[אוק]'; }
  else if (relevantPart.includes('_דצ_') || relevantPart.includes(' דצ ') || relevantPart.includes('דצמבר')) { cycleInfo = 'דצמבר'; cycleTag = '[דצ]'; }

  let yearInfo = '';
  if (relevantPart.includes('2025')) { yearInfo = '2025'; }
  else if (relevantPart.includes('2026')) { yearInfo = '2026'; }
  else if (relevantPart.match(/[\s_-]25[\s_\.]|^25[\s_\.]|[\s_-]25$|^25$/)) { yearInfo = '2025'; }
  else if (relevantPart.match(/[\s_-]26[\s_\.]|^26[\s_\.]|[\s_-]26$|^26$/)) { yearInfo = '2026'; }

  let fullCycleTag = '';
  if (cycleInfo && yearInfo) { fullCycleTag = `${cycleTag}${yearInfo.substring(2)}`; }
  else if (cycleInfo) { fullCycleTag = cycleTag; }
  else if (yearInfo) { fullCycleTag = `[${yearInfo}]`; }

  let excelContent = `📊 <b>שם הקובץ: ${fileName}</b>\n`;
  excelContent += `תאריך העלאה: ${new Date().toLocaleString('he-IL')}\n`;
  if (groupName) excelContent += `📌 קבוצה/יחידה: <b>${groupName}</b> (${groupTag})\n`;
  if (cycleInfo || yearInfo) excelContent += `📅 מחזור/תקופה: <b>${cycleInfo}${yearInfo ? ' ' + yearInfo : ''}</b> (${fullCycleTag})\n`;
  excelContent += `${'='.repeat(80)}\n\n`;

  let totalRecords = 0;

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!allData || allData.length === 0) return;

    const headerRowIdx = findHeaderRowIndexGlobal(allData);
    const headers = extractHeaders(allData[headerRowIdx]);

    const dataRows = allData.slice(headerRowIdx + 1);
    const validRows = dataRows.filter(r => r && Array.isArray(r) && r.some(v => v !== undefined && v !== null && cleanText(v) !== ''));

    excelContent += `📋 גיליון: "${sheetName}"\n`;
    excelContent += `• כמות רשומות/שורות: ${validRows.length}\n`;
    excelContent += `• עמודות שנמצאו: ${headers.join(' | ')}\n\n`;

    validRows.forEach((row, index) => {
      const rowData = {};
      headers.forEach((header, colIdx) => {
        const val = cleanText(row[colIdx]);
        if (val !== '') {
          rowData[header] = val;
        }
      });

      if (Object.keys(rowData).length > 0) {
        excelContent += `${groupTag}${fullCycleTag} 📌 שורה ${totalRecords + index + 1}:\n`;
        Object.entries(rowData).forEach(([colName, colVal]) => {
          excelContent += `  • ${colName}: ${colVal}\n`;
        });
        excelContent += `\n`;
      }
    });

    totalRecords += validRows.length;
    excelContent += `${'='.repeat(80)}\n\n`;
  });

  excelContent += `\n📊 סיכום כללי:\n`;
  excelContent += `• סה"כ רשומות בקובץ: ${totalRecords}\n`;
  excelContent += `• סה"כ גיליונות: ${workbook.SheetNames.length}\n`;

  return {
    groupName,
    groupTag,
    cycleInfo,
    yearInfo,
    fullCycleTag,
    totalRecords,
    excelContent
  };
}
