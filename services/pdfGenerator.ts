
import jsPDF from 'jspdf';
import { AppData } from '../types';

// --- BRINDLE BRANDING & LAYOUT CONSTANTS ---
const COLORS = {
  DARK: '#1f313b',
  ORANGE: '#e57a3a',
  MUTED: '#89a6aa',
  LIGHT: '#f0efef',
  TEXT: '#424143',
  WHITE: '#FFFFFF',
  GREEN: '#28a745',
  RED: '#dc3545'
};

const PAGE = {
  WIDTH: 215.9,
  HEIGHT: 279.4,
  MARGIN: 15,
  CONTENT_WIDTH: 185.9
};

// Tighter spacing to ensure everything fits
const SPACING = {
  SECTION: 9,
  ITEM: 1.5,
  COLUMN: 10
};

// --- DRAWING UTILITIES ---
const drawSectionTitle = (doc: jsPDF, y: number, text: string) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.DARK);
  doc.text(text.toUpperCase(), PAGE.WIDTH / 2, y, { align: 'center' });
  doc.setFillColor(COLORS.ORANGE);
  doc.rect((PAGE.WIDTH - 20) / 2, y + 1.5, 20, 0.75, 'F');
  return y + 8;
};

const drawBulletedColumn = (doc: jsPDF, y: number, x: number, maxWidth: number, title: string, items: string[], bulletColor: string) => {
  let currentY = y;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.DARK);
  doc.text(title, x, currentY);
  currentY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT);
  const lineHeight = 5;

  items.forEach(item => {
    const lines = doc.splitTextToSize(item, maxWidth - 8);
    doc.setFillColor(bulletColor);
    doc.circle(x + 1.5, currentY - 1.5, 1.5, 'F');
    
    lines.forEach((line: string) => {
      doc.text(line, x + 6, currentY);
      currentY += lineHeight;
    });
    currentY += SPACING.ITEM; 
  });
  return currentY;
};

const drawInfoBox = (doc: jsPDF, y: number, x: number, maxWidth: number, title: string, textLines: string[]) => {
  let currentY = y;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.DARK);
  doc.text(title, x, currentY);
  currentY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT);
  const lineHeight = 5;

  textLines.forEach(item => {
    const lines = doc.splitTextToSize(item, maxWidth);
    lines.forEach((line: string) => {
      doc.text(line, x, currentY);
      currentY += lineHeight;
    });
    currentY += SPACING.ITEM;
  });
  return currentY;
};

const drawActionableSteps = (doc: jsPDF, y: number, title: string, items: string[]) => {
  let currentY = y;
  currentY = drawSectionTitle(doc, currentY, title);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.TEXT);
  const lineHeight = 5;

  items.forEach(item => {
    const textBlocks = item.split('\n'); // Handle manual line breaks

    doc.setFillColor(COLORS.ORANGE);
    doc.circle(PAGE.MARGIN + 2.5, currentY - 1.5, 1.5, 'F');

    textBlocks.forEach(block => {
      const lines = doc.splitTextToSize(block, PAGE.CONTENT_WIDTH - 8);
      lines.forEach((line: string) => {
        doc.text(line, PAGE.MARGIN + 8, currentY);
        currentY += lineHeight;
      });
    });

    currentY += SPACING.ITEM * 2;
  });
  return currentY;
};


// --- PDF GENERATION CORE ---
export const generatePDF = async (data: AppData, chartImages?: { quarterly: string; yearly: string; stats: string }) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  let cursorY = 0;

  // 1. HEADER
  doc.setFillColor(COLORS.DARK);
  doc.rect(0, 0, PAGE.WIDTH, 28, 'F');
  doc.setFillColor(COLORS.ORANGE);
  doc.rect(0, 28, PAGE.WIDTH, 1.5, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(COLORS.WHITE);
  doc.text("BRINDLE DIGITAL", PAGE.MARGIN, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.LIGHT);
  doc.text(`QUARTERLY AUDIT: ${data.clientName.toUpperCase()}  •  Q${data.quarter} ${data.year}`, PAGE.MARGIN, 23);
  cursorY = 28 + 1.5 + SPACING.SECTION;

  // 2. VISUALS & SUMMARY
  if (chartImages) {
    const chartColWidth = (PAGE.CONTENT_WIDTH - SPACING.COLUMN) / 2;
    const chartProps = doc.getImageProperties(chartImages.quarterly);
    const chartAspect = chartProps.width / chartProps.height;
    const chartHeight = chartColWidth / chartAspect;

    doc.addImage(chartImages.quarterly, 'PNG', PAGE.MARGIN, cursorY, chartColWidth, chartHeight);
    doc.addImage(chartImages.yearly, 'PNG', PAGE.MARGIN + chartColWidth + SPACING.COLUMN, cursorY, chartColWidth, chartHeight);
    cursorY += chartHeight + SPACING.SECTION;

    const bottomRowY = cursorY;
    const bottomColWidth = (PAGE.CONTENT_WIDTH - SPACING.COLUMN) / 2;
    const col1X = PAGE.MARGIN;
    const col2X = PAGE.MARGIN + bottomColWidth + SPACING.COLUMN;

    const statsProps = doc.getImageProperties(chartImages.stats);
    const statsAspect = statsProps.width / statsProps.height;
    const statsHeight = bottomColWidth / statsAspect;
    doc.addImage(chartImages.stats, 'PNG', col1X, bottomRowY, bottomColWidth, statsHeight);
    const statsEndY = bottomRowY + statsHeight;

    const summaryEndY = drawInfoBox(doc, bottomRowY, col2X, bottomColWidth, "Executive Summary", data.analysis?.executiveSummary || ["No summary available."]);
    
    cursorY = Math.max(statsEndY, summaryEndY);
  }
  
  cursorY += SPACING.SECTION;

  // 3. KEY INSIGHTS
  cursorY = drawSectionTitle(doc, cursorY, "Key Insights");
  const colWidth = (PAGE.CONTENT_WIDTH - SPACING.COLUMN) / 2;
  const insightsCol1X = PAGE.MARGIN;
  const insightsCol2X = PAGE.MARGIN + colWidth + SPACING.COLUMN;
  
  // Safeguard: Ensure a maximum of 3 items are displayed
  const wins = (data.analysis?.wins || []).slice(0, 3);
  const trends = (data.analysis?.trends || []).slice(0, 3);

  const col1EndY = drawBulletedColumn(doc, cursorY, insightsCol1X, colWidth, "Wins & Successes", wins, COLORS.GREEN);
  const col2EndY = drawBulletedColumn(doc, cursorY, insightsCol2X, colWidth, "Areas for Improvement", trends, COLORS.RED);
  cursorY = Math.max(col1EndY, col2EndY) + SPACING.SECTION;

  // 4. ACTIONABLE NEXT STEPS
  const nextSteps = [
    "To help drive even more 5-star reviews next quarter, I highly recommend checking out our latest guide:\nBrindle Review Resource Guide: https://brindledigital.com/wp-content/uploads/2025/11/10_25_Brindle_ApartmentReviewResourceGuide_8.5x11-2.pdf",
    "Our team can design a branded QR Card for your community for a one time $95 fee. Reach out to your dedicated account manager to learn more."
  ];
  cursorY = drawActionableSteps(doc, cursorY, "Actionable Next Steps", nextSteps);
  cursorY += SPACING.SECTION / 2;

  // 5. BOTTOM CALLOUT PANEL (Positioned sequentially)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const goalText = `To increase your YTD rating by +0.1, you need approximately ${data.metrics.reviewsToImprove} new 5-star reviews.`;
  const goalTextLines = doc.splitTextToSize(goalText, PAGE.CONTENT_WIDTH - 20);
  const goalTextHeight = goalTextLines.length * 5;

  const PADDING_V = 10;
  const LINE_SPACING = 4;
  const LINK_HEIGHT = 8;
  const boxContentHeight = PADDING_V + goalTextHeight + LINE_SPACING + 1 + LINE_SPACING + LINK_HEIGHT + LINK_HEIGHT + PADDING_V;

  const calloutBoxY = cursorY;
  doc.setFillColor(COLORS.DARK);
  doc.roundedRect(PAGE.MARGIN, calloutBoxY, PAGE.CONTENT_WIDTH, boxContentHeight, 3, 3, 'F');
  
  let textY = calloutBoxY + PADDING_V;
  doc.setTextColor(COLORS.WHITE);
  doc.text(goalTextLines, PAGE.WIDTH / 2, textY, { align: 'center' });
  textY += goalTextHeight + LINE_SPACING;

  doc.setDrawColor(COLORS.MUTED);
  doc.line(PAGE.MARGIN + 10, textY, PAGE.WIDTH - PAGE.MARGIN - 10, textY);
  textY += LINE_SPACING + 1;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.ORANGE);
  doc.text("Free Resource:", PAGE.MARGIN + 10, textY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.WHITE);
  doc.textWithLink("Brindle Apartment Review Guide", PAGE.MARGIN + 40, textY, { url: "https://brindledigital.com/wp-content/uploads/2025/11/10_25_Brindle_ApartmentReviewResourceGuide_8.5x11-2.pdf" });
  textY += LINK_HEIGHT;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.ORANGE);
  doc.text("Premium Upsell:", PAGE.MARGIN + 10, textY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.WHITE);
  doc.text("Custom Property QR Cards for Review Generation ($95)", PAGE.MARGIN + 43, textY);

  // SAVE
  doc.save(`${data.clientName}_Q${data.quarter}_Report.pdf`);
};
