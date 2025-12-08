/**
 * Individual Response PDF Builder
 * 
 * Generates PDF documents with one page per survey response/session.
 * Each page shows all questions and answers for a single respondent.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

interface IndividualResponse {
  sessionId: string;
  status: string;
  startedAt: Date;
  finalizedAt: Date | null;
  duration: number;
  device: string;
  ipAddress?: string;
  answers: Array<{
    questionId: string;
    questionText: string;
    questionType: string;
    answer: string;
    pageTitle: string;
  }>;
}

interface PdfOptions {
  surveyName: string;
  collectorName: string;
  responses: IndividualResponse[];
  generatedAt: Date;
}

export class IndividualResponsePdfBuilder {
  private static browser: Browser | null = null;

  /**
   * Initialize browser instance (reuse for performance)
   */
  private static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      try {
        console.log('Launching Puppeteer browser for individual responses...');
        
        // Use system Chromium if available (for Docker/Alpine/PM2)
        let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        
        if (!executablePath) {
          // Try to find Chromium in common locations
          const { execSync } = require('child_process');
          try {
            executablePath = execSync('which chromium-browser || which chromium || which google-chrome', { encoding: 'utf8' }).trim();
            if (!executablePath || executablePath === '') {
              executablePath = undefined;
            }
          } catch (e) {
            executablePath = undefined;
          }
        }
        
        if (executablePath) {
          console.log('Using system Chromium at:', executablePath);
        } else {
          console.log('Using Puppeteer bundled Chromium');
        }
        
        this.browser = await puppeteer.launch({
          headless: true,
          executablePath: executablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-software-rasterizer',
            '--disable-extensions'
          ]
        });
        console.log('Puppeteer browser launched successfully');
      } catch (error) {
        console.error('Failed to launch Puppeteer browser:', error);
        throw new Error(`Failed to launch browser: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Generate PDF from HTML template
   */
  static async generatePdf(options: PdfOptions): Promise<Buffer> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      browser = await this.getBrowser();
      page = await browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 1600 });
      
      const html = this.generateHtml(options);
      
      if (!html || html.length === 0) {
        throw new Error('Generated HTML is empty');
      }

      console.log('Setting page content for individual responses, HTML length:', html.length);
      
      // Set content and wait for it to load
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Wait a bit for rendering
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Generating PDF for individual responses...');

      // Generate PDF with one page per response
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        },
        preferCSSPageSize: false
      });

      console.log('Individual responses PDF generated, size:', pdf?.length || 0, 'bytes');

      // Validate PDF was generated
      if (!pdf) {
        throw new Error('PDF generation returned null');
      }

      if (pdf.length === 0) {
        throw new Error('Generated PDF is empty (0 bytes)');
      }

      if (pdf.length < 1000) {
        const preview = Buffer.from(pdf.slice(0, Math.min(100, pdf.length))).toString('utf8');
        console.error('PDF preview (first 100 bytes):', preview);
        throw new Error(`Generated PDF is too small (${pdf.length} bytes), likely corrupted`);
      }

      // Verify it's actually a PDF (should start with %PDF)
      const pdfHeaderBytes = Buffer.from(pdf.slice(0, 4));
      const expectedHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
      if (!pdfHeaderBytes.equals(expectedHeader)) {
        const headerStr = pdfHeaderBytes.toString('ascii');
        throw new Error(`Generated file does not appear to be a valid PDF. Header: ${headerStr}`);
      }

      console.log('Individual responses PDF validation passed, size:', pdf.length, 'bytes');
      
      // Ensure we return a Buffer
      const pdfBuffer = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
      return pdfBuffer;
    } catch (error) {
      console.error('Individual responses PDF generation error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (e) {
          console.error('Error closing page:', e);
        }
      }
    }
  }

  /**
   * Generate HTML template with individual responses
   */
  private static generateHtml(options: PdfOptions): string {
    const { surveyName, collectorName, responses, generatedAt } = options;

    const responsePages = responses.map((response, index) => 
      this.generateResponsePage(response, index + 1, responses.length, collectorName, surveyName)
    ).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(surveyName)} - Individual Responses</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #333;
      line-height: 1.6;
      background: #fff;
    }
    
    .response-page {
      page-break-after: always;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .response-page:last-child {
      page-break-after: auto;
    }
    
    .response-header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    
    .response-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    
    .response-number {
      font-size: 32px;
      font-weight: 700;
      color: #1e293b;
    }
    
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-completed {
      background: #10b981;
      color: white;
    }
    
    .status-terminated {
      background: #ef4444;
      color: white;
    }
    
    .status-in-progress {
      background: #f59e0b;
      color: white;
    }
    
    .response-meta {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      font-size: 13px;
      color: #64748b;
    }
    
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    
    .meta-label {
      font-weight: 600;
      color: #475569;
      margin-bottom: 4px;
    }
    
    .meta-value {
      color: #64748b;
    }
    
    .survey-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }
    
    .collector-name {
      font-size: 14px;
      color: #64748b;
    }
    
    .answers-section {
      flex: 1;
      margin-top: 20px;
    }
    
    .page-divider {
      margin: 20px 0;
      padding: 10px 0;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .question-item {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .question-item:last-child {
      border-bottom: none;
    }
    
    .question-text {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 10px;
      line-height: 1.5;
    }
    
    .answer-text {
      font-size: 14px;
      color: #334155;
      line-height: 1.6;
      padding-left: 20px;
      border-left: 3px solid #2563eb;
      padding-top: 8px;
      padding-bottom: 8px;
    }
    
    .answer-empty {
      color: #94a3b8;
      font-style: italic;
    }
    
    .footer {
      margin-top: auto;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
    
    @media print {
      .response-page {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  ${responsePages}
  
  <div class="footer" style="page-break-after: auto;">
    <p>Generated on ${generatedAt.toLocaleDateString()} at ${generatedAt.toLocaleTimeString()}</p>
    <p>This report was generated automatically by the Survey Analytics System</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate a single response page
   */
  private static generateResponsePage(
    response: IndividualResponse, 
    responseNumber: number, 
    totalResponses: number,
    collectorName: string,
    surveyName: string
  ): string {
    const statusClass = response.status === 'COMPLETED' 
      ? 'status-completed' 
      : response.status === 'TERMINATED' 
      ? 'status-terminated' 
      : 'status-in-progress';
    
    const statusText = response.status === 'COMPLETED' 
      ? 'Complete' 
      : response.status === 'TERMINATED' 
      ? 'Terminated' 
      : 'In Progress';
    
    const startedDate = new Date(response.startedAt);
    const finalizedDate = response.finalizedAt ? new Date(response.finalizedAt) : null;
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    };
    
    const formatDuration = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      const secs = Math.floor((minutes % 1) * 60);
      if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Group answers by page
    const answersByPage = new Map<string, typeof response.answers>();
    response.answers.forEach(answer => {
      const pageTitle = answer.pageTitle || 'Page 1';
      if (!answersByPage.has(pageTitle)) {
        answersByPage.set(pageTitle, []);
      }
      answersByPage.get(pageTitle)!.push(answer);
    });
    
    const answersHtml = Array.from(answersByPage.entries()).map(([pageTitle, answers]) => {
      const pageDivider = answersByPage.size > 1 ? `<div class="page-divider">${this.escapeHtml(pageTitle)}</div>` : '';
      const questionsHtml = answers.map((answer, idx) => `
        <div class="question-item">
          <div class="question-text">${this.escapeHtml(answer.questionText)}</div>
          <div class="answer-text ${!answer.answer || answer.answer === 'No answer provided' ? 'answer-empty' : ''}">
            ${this.escapeHtml(answer.answer || 'No answer provided')}
          </div>
        </div>
      `).join('');
      
      return pageDivider + questionsHtml;
    }).join('');

    return `
      <div class="response-page">
        <div class="response-header">
          <div class="survey-title">${this.escapeHtml(surveyName)}</div>
          <div class="response-title">
            <div class="response-number">#${responseNumber}</div>
            <div class="status-badge ${statusClass}">${statusText}</div>
          </div>
          <div class="response-meta">
            <div class="meta-item">
              <span class="meta-label">Collector</span>
              <span class="meta-value">${this.escapeHtml(collectorName)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Started</span>
              <span class="meta-value">${formatDate(startedDate)} ${formatTime(startedDate)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Last Modified</span>
              <span class="meta-value">${finalizedDate ? `${formatDate(finalizedDate)} ${formatTime(finalizedDate)}` : 'N/A'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Time Spent</span>
              <span class="meta-value">${formatDuration(response.duration)}</span>
            </div>
            ${response.ipAddress ? `
            <div class="meta-item">
              <span class="meta-label">IP Address</span>
              <span class="meta-value">${response.ipAddress}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <div class="answers-section">
          ${answersHtml || '<p style="color: #94a3b8; font-style: italic;">No answers provided</p>'}
        </div>
        
        <div class="footer">
          <p>Response ${responseNumber} of ${totalResponses}</p>
        </div>
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m] || m);
  }
}


