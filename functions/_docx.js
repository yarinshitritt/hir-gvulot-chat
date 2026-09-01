import { unzipSync, strFromU8 } from 'fflate';

const XML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeXmlEntities(str) {
  return str.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, (match, entity) => {
    if (entity in XML_ENTITIES) return XML_ENTITIES[entity];
    if (entity[0] === '#') {
      const code = entity[1] === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return match;
  });
}

// ממיר את ה-XML הפנימי של Word (word/document.xml) לטקסט פשוט וקריא:
// כל <w:p> הופך לפסקה נפרדת, וכל <w:t> בתוכה נשמר כטקסט
function documentXmlToText(xml) {
  const paragraphs = xml.split(/<w:p[ >]/).slice(1);
  const lines = paragraphs.map(p => {
    const runs = [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => decodeXmlEntities(m[1]));
    return runs.join('');
  });
  return lines.filter(l => l.trim() !== '').join('\n');
}

export function extractDocxText(arrayBuffer) {
  const zip = unzipSync(new Uint8Array(arrayBuffer));
  const docXml = zip['word/document.xml'];
  if (!docXml) {
    throw new Error('לא נמצא word/document.xml בתוך קובץ ה-Word');
  }
  return documentXmlToText(strFromU8(docXml));
}
