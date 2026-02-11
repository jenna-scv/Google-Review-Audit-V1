
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, Loader2, RefreshCw, AlertCircle, Copy, Check, Star, Calendar } from 'lucide-react';
import { AppData, Review } from './types';
import { parseCSV } from './services/csvParser';
import { processReviews } from './services/analytics';
import { analyzeReviews } from './services/gemini';
import { generatePDF } from './services/pdfGenerator';
import { ChartsView } from './components/ChartsView';
import html2canvas from 'html2canvas';

const RESOURCE_GUIDE_URL = "https://brindledigital.com/wp-content/uploads/2025/11/10_25_Brindle_ApartmentReviewResourceGuide_8.5x11-2.pdf";

function App() {
  const [step, setStep] = useState<'upload' | 'processing' | 'preview'>('upload');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [appData, setAppData] = useState<AppData | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [clientName, setClientName] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentQuarter = Math.floor(today.getMonth() / 3) + 1;

  const [targetYear, setTargetYear] = useState<number>(currentYear);
  const [targetQuarter, setTargetQuarter] = useState<number>(currentQuarter);

  const chartsRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLPreElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const startProcessing = async () => {
    if (!csvFile || !clientName) {
      setError("Please provide a client name and CSV file.");
      return;
    }

    setStep('processing');
    setLoadingMsg("Parsing CSV Data...");
    setError(null);

    try {
      const text = await csvFile.text();
      const reviews = parseCSV(text);
      
      setLoadingMsg(`Analyzing Q${targetQuarter} ${targetYear}...`);
      const { previousQuarterReviews, ...processedData } = processReviews(reviews, clientName, targetYear, targetQuarter);

      setLoadingMsg("Generating AI Insights...");
      const analysis = await analyzeReviews(
        processedData.quarterlyReviews, 
        previousQuarterReviews,
        clientName, 
        { year: targetYear, quarter: targetQuarter }
      );
      
      setAppData({ ...processedData, analysis });
      setStep('preview');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
      setStep('upload');
    }
  };

  const handleDownload = async () => {
    if (!appData) return;

    const quarterlyChartEl = document.getElementById('quarterly-volume-chart-wrapper');
    const yearlyChartEl = document.getElementById('yearly-growth-chart-wrapper');
    const statsWidgetEl = document.getElementById('key-stats-widget-wrapper');

    if (!quarterlyChartEl || !yearlyChartEl || !statsWidgetEl) {
        setError("Could not find all required elements for PDF generation.");
        return;
    }

    setLoadingMsg("Generating PDF...");
    const oldStep = step;
    setStep('processing');
    
    try {
        const canvasOptions = { scale: 3, backgroundColor: '#ffffff' };
        
        const [quarterlyCanvas, yearlyCanvas, statsCanvas] = await Promise.all([
            html2canvas(quarterlyChartEl, canvasOptions),
            html2canvas(yearlyChartEl, canvasOptions),
            html2canvas(statsWidgetEl, canvasOptions)
        ]);

        const chartImages = {
            quarterly: quarterlyCanvas.toDataURL('image/png'),
            yearly: yearlyCanvas.toDataURL('image/png'),
            stats: statsCanvas.toDataURL('image/png'),
        };
        
        await generatePDF(appData, chartImages);
        setStep(oldStep);
    } catch (e) {
        console.error("PDF Generation Error:", e);
        setError("Failed to generate PDF");
        setStep(oldStep);
    }
  };

  const getEmailBody = (data: AppData) => {
    if (!data.analysis) return "";
    
    const wins = data.analysis.wins.map(w => `• ${w}`).join("\n");
    const opportunities = data.analysis.opportunities.map(o => `• ${o}`).join("\n");
    const trends = data.analysis.trends.map(t => `• ${t}`).join("\n");

    return `Subject: Q${data.quarter} Review Audit - ${data.clientName}

Hi ${data.clientName} Team,

I've completed your Reputation Audit for Q${data.quarter} ${data.year}. Attached is the full PDF report with detailed visual trends and staff callouts.

Below is a scannable snapshot of our findings:

📊 PERFORMANCE SNAPSHOT
• Q${data.quarter} Average Rating: ${data.metrics.currentQuarterAvg.toFixed(2)} / 5.0
• New Reviews This Quarter: ${data.metrics.currentQuarterTotal}
• YTD Average Rating: ${data.metrics.ytdAvg.toFixed(2)}

🌟 WHAT RESIDENTS ARE LOVING
${wins || "Positive sentiment remains stable across the community."}

🛠 OPERATIONAL FOCUS AREAS
${trends || "Continue focusing on consistent communication and maintenance response times."}

💡 OPPORTUNITIES FOR GROWTH
${opportunities}

Next Steps:

- To help drive even more 5-star reviews next quarter, I highly recommend checking out our latest guide:
  📖 Brindle Review Resource Guide: ${RESOURCE_GUIDE_URL}

- Our team can design a branded QR Card for your community for a one time $95 fee. Reach out to your dedicated account manager to learn more.

Please let me know if you have any questions about these trends or would like to discuss a specific action plan!

Best regards,

[Your Name]
Brindle Digital`;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="bg-brindle-dark text-white p-6 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-brindle-orange rounded-full flex items-center justify-center text-brindle-dark font-bold text-xl">B</div>
             <div>
                <h1 className="text-xl font-bold tracking-wide">Brindle Quarterly Audit</h1>
                <p className="text-xs text-brindle-muted">Automated Reporting Tool</p>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 mt-6 mb-20">
        {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2">
                <AlertCircle size={20} />
                <span>{error}</span>
            </div>
        )}

        {step === 'upload' && (
          <div className="bg-white rounded-xl shadow-lg p-10 max-w-2xl mx-auto text-center border border-gray-100">
            <h2 className="text-2xl font-bold text-brindle-dark mb-2">Create New Report</h2>
            <p className="text-gray-500 mb-8">Upload your CSV and select the target reporting period.</p>
            <div className="space-y-6 text-left">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                    <input 
                        type="text" 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brindle-orange outline-none"
                        placeholder="e.g. The Artisan Apartments"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Year</label>
                        <select 
                            className="w-full p-3 border border-gray-300 rounded-lg outline-none bg-white"
                            value={targetYear}
                            onChange={(e) => setTargetYear(parseInt(e.target.value))}
                        >
                            {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Quarter</label>
                        <select 
                            className="w-full p-3 border border-gray-300 rounded-lg outline-none bg-white"
                            value={targetQuarter}
                            onChange={(e) => setTargetQuarter(parseInt(e.target.value))}
                        >
                            {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
                        </select>
                    </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors relative">
                    <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload className="mx-auto h-12 w-12 text-brindle-muted mb-3" />
                    <p className="text-sm font-medium text-gray-900">{csvFile ? csvFile.name : "Click to upload CSV"}</p>
                </div>
                <button 
                    onClick={startProcessing}
                    disabled={!csvFile || !clientName}
                    className="w-full py-4 bg-brindle-orange text-brindle-dark rounded-lg font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg"
                >
                    Generate Report
                </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
             <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="h-16 w-16 text-brindle-orange animate-spin mb-6" />
                <h3 className="text-xl font-semibold text-brindle-dark">{loadingMsg}</h3>
             </div>
        )}

        {step === 'preview' && appData && (
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-brindle-dark">Quarterly Report Dashboard</h2>
                        <p className="text-gray-500 font-medium">Q{appData.quarter} {appData.year} Review Performance for {appData.clientName}</p>
                    </div>
                    <div className="flex gap-3">
                         <button onClick={() => setStep('upload')} className="px-4 py-2 border border-gray-300 rounded-lg text-brindle-text hover:bg-gray-50 flex items-center gap-2 transition-colors font-semibold"><RefreshCw size={16} /> Start Over</button>
                         <button onClick={handleDownload} className="px-6 py-2 bg-brindle-orange text-brindle-dark font-bold rounded-lg hover:bg-opacity-80 flex items-center gap-2 shadow-md transition-colors"><Download size={18} /> Download Audit PDF</button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
                     <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-brindle-dark text-lg">Visual Performance Charts</h3>
                        <span className="text-xs font-bold text-brindle-orange uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full">Screenshot Ready</span>
                     </div>
                     <div ref={chartsRef}><ChartsView data={appData} /></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-brindle-dark mb-6 border-b pb-4 flex items-center gap-2">
                          <AlertCircle className="text-brindle-orange" size={20} /> Areas for Improvement
                        </h3>
                        <ul className="space-y-4">
                            {appData.analysis?.trends.map((t, i) => (
                              <li key={i} className="flex gap-3 text-sm text-gray-700 items-start">
                                <span className="bg-red-100 text-red-600 rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center font-bold text-[10px] mt-0.5">!</span>
                                {t}
                              </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                         <h3 className="text-xl font-bold text-brindle-dark mb-6 border-b pb-4 flex items-center gap-2">
                           <Star className="text-green-600" size={20} /> Wins & Successes
                         </h3>
                         <ul className="space-y-4">
                            {appData.analysis?.wins.map((t, i) => (
                              <li key={i} className="flex gap-3 text-sm text-gray-700 items-start">
                                <span className="bg-green-100 text-green-600 rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center font-bold text-[10px] mt-0.5">✓</span>
                                {t}
                              </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8 overflow-hidden">
                     <div className="bg-brindle-dark px-8 py-5 flex justify-between items-center">
                         <h3 className="font-bold text-white text-lg flex items-center gap-2"><FileText size={20} /> Executive Email Template</h3>
                         <button 
                          onClick={() => {navigator.clipboard.writeText(emailRef.current?.innerText || ''); setCopied(true); setTimeout(() => setCopied(false), 2000);}} 
                          className="bg-brindle-orange text-brindle-dark px-5 py-2 rounded-lg font-bold hover:bg-opacity-90 flex items-center gap-2 transition-all shadow-md"
                         >
                           {copied ? <Check size={18} /> : <Copy size={18} />}
                           {copied ? "Copied to Clipboard" : "Copy Template"}
                         </button>
                     </div>
                     <div className="p-8 bg-gray-50">
                         <pre ref={emailRef} className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed bg-white p-10 rounded-xl border border-gray-200 shadow-inner max-h-[600px] overflow-auto border-t-4 border-t-brindle-orange">
                           {getEmailBody(appData)}
                         </pre>
                     </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

export default App;
