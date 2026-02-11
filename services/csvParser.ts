import { Review } from '../types';

// Robust CSV Parsing State Machine
// Handles: Multi-line fields, escaped quotes, dynamic delimiters
export const parseCSV = (csvText: string): Review[] => {
  // 1. Remove BOM and clean
  const content = csvText.replace(/^\uFEFF/, '');
  
  // 2. Detect Delimiter (Scan first 1000 chars)
  const sample = content.slice(0, 1000);
  const delimiters = [',', ';', '\t', '|'];
  let delimiter = ',';
  let maxCount = 0;

  delimiters.forEach(d => {
    // Count occurrences outside of quotes (rough approx)
    let inQ = false;
    let count = 0;
    for (const char of sample) {
        if (char === '"') inQ = !inQ;
        else if (char === d && !inQ) count++;
    }
    if (count > maxCount) {
        maxCount = count;
        delimiter = d;
    }
  });

  // 3. Parse Rows (State Machine)
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote ("") -> add one " and skip next
        currentField += '"';
        i++; 
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } 
    else if (char === delimiter && !inQuotes) {
      // Field Delimiter
      currentRow.push(currentField.trim());
      currentField = '';
    }
    else if ((char === '\n' || char === '\r') && !inQuotes) {
      // Row Delimiter
      if (char === '\r' && nextChar === '\n') i++; // Handle CRLF
      
      currentRow.push(currentField.trim());
      // Only add non-empty rows
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } 
    else {
      currentField += char;
    }
  }
  // Flush last
  if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
  }

  if (rows.length === 0) {
    throw new Error("File appears to be empty.");
  }

  // --- 4. Find Header Row ---
  let headerRowIndex = -1;
  let headers: string[] = [];

  // Look for row with "date" and "rating" (or stars)
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
     const rowLower = rows[i].map(c => c.toLowerCase().replace(/^"|"$/g, ''));
     
     const hasDate = rowLower.some(h => 
         h.includes('date') || h.includes('time') || h.includes('published') || h.includes('period') || h.includes('timestamp')
     );
     const hasRating = rowLower.some(h => 
         h.includes('rating') || h.includes('star') || h.includes('score') || h.includes('grade') || h.includes('value')
     );
     
     if (hasDate && hasRating) {
         headerRowIndex = i;
         headers = rowLower;
         break;
     }
  }

  if (headerRowIndex === -1) {
      // Fallback: Assume first row
      headerRowIndex = 0;
      headers = rows[0].map(h => h.toLowerCase().replace(/^"|"$/g, ''));
  }

  // --- 5. Map Columns ---
  const findCol = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

  const dateIdx = findCol(['date', 'time', 'published', 'created', 'posted', 'timestamp', 'period']);
  const ratingIdx = findCol(['rating', 'star', 'score', 'grade']);
  const textIdx = findCol(['text', 'review', 'content', 'comment', 'body', 'message', 'description', 'feedback']);
  const reviewerIdx = findCol(['name', 'reviewer', 'author', 'user', 'customer', 'client', 'person']);

  if (dateIdx === -1 || ratingIdx === -1) {
    throw new Error(`Could not identify Date or Rating columns. Found headers: ${headers.join(', ')}`);
  }

  // --- 6. Parse Data ---
  const reviews: Review[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip if row doesn't have enough columns (malformed)
    if (row.length <= Math.max(dateIdx, ratingIdx)) continue;

    const dateStr = row[dateIdx] || "";
    const ratingStr = row[ratingIdx] || "0";
    const text = textIdx !== -1 ? (row[textIdx] || "") : "";
    const reviewer = reviewerIdx !== -1 ? (row[reviewerIdx] || "Anonymous") : "Anonymous";

    // Clean Rating
    const ratingClean = parseFloat(ratingStr.replace(/[^\d.]/g, '')) || 0;

    // Parse Date
    const parsedDate = parseDate(dateStr);

    if (!isNaN(parsedDate.getTime())) {
      reviews.push({
        date: dateStr.replace(/^"|"$/g, '').trim(), // Keep original string for display
        sourceDate: parsedDate,
        rating: ratingClean,
        text: text.replace(/^"|"$/g, '').trim(),
        reviewer: reviewer.replace(/^"|"$/g, '').trim()
      });
    }
  }

  return reviews.sort((a, b) => b.sourceDate.getTime() - a.sourceDate.getTime());
};

// Date Parser Utility
const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date("Invalid");
    const clean = dateStr.replace(/['"]/g, '').trim();

    // 1. Relative Dates
    const now = new Date();
    const lower = clean.toLowerCase();
    
    if (lower === 'today') return now;
    if (lower === 'yesterday') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d;
    }
    if (lower.includes('ago')) {
        const numMatch = lower.match(/(\d+)/);
        const val = numMatch ? parseInt(numMatch[0]) : 1;
        const d = new Date();
        
        if (lower.includes('day')) d.setDate(d.getDate() - val);
        else if (lower.includes('week')) d.setDate(d.getDate() - (val * 7));
        else if (lower.includes('month')) d.setMonth(d.getMonth() - val);
        else if (lower.includes('year')) d.setFullYear(d.getFullYear() - val);
        
        return d;
    }

    // 2. ISO / Standard
    let parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) return parsed;

    // 3. Custom Formats
    // "Oct 12, 2024" is usually handled by new Date(), but let's be safe
    // "12/05/2024" vs "05/12/2024"
    const parts = clean.match(/(\d+)/g);
    if (parts && parts.length >= 3) {
        const n1 = parseInt(parts[0]);
        const n2 = parseInt(parts[1]);
        const n3 = parseInt(parts[2]);

        // YYYY-MM-DD
        if (parts[0].length === 4) return new Date(n1, n2 - 1, n3);
        
        // MM/DD/YYYY (US default)
        if (n1 <= 12 && parts[2].length === 4) return new Date(n3, n1 - 1, n2);
        
        // DD/MM/YYYY (fallback)
        if (n2 <= 12 && parts[2].length === 4) return new Date(n3, n2 - 1, n1);
    }

    return new Date("Invalid");
};