/**
 * PDF Builder
 * 
 * Generates PDF documents with charts and analytics for survey summaries.
 * Uses Puppeteer to render HTML with Chart.js to PDF.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { QuestionSummary } from './summary-aggregator';

interface PdfOptions {
  surveyName: string;
  collectorName: string;
  summaries: QuestionSummary[];
  generatedAt: Date;
}

export class PdfBuilder {
  private static browser: Browser | null = null;

  /**
   * Initialize browser instance (reuse for performance)
   */
  private static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      try {
        console.log('Launching Puppeteer browser...');
        
        // Use system Chromium if available (for Docker/Alpine/PM2)
        // Try common Chromium paths
        let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        
        if (!executablePath) {
          // Try to find Chromium in common locations
          const { execSync } = require('child_process');
          try {
            // Try which command to find chromium
            executablePath = execSync('which chromium-browser || which chromium || which google-chrome', { encoding: 'utf8' }).trim();
            if (!executablePath || executablePath === '') {
              executablePath = undefined;
            }
          } catch (e) {
            // Chromium not found in PATH, Puppeteer will use bundled version
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

      console.log('Setting page content, HTML length:', html.length);
      
      // Set content and wait for it to load
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      console.log('Page content loaded, waiting for Chart.js...');

      // Wait for Chart.js to load from CDN (optional, don't fail if it doesn't)
      try {
        await page.waitForFunction(
          () => typeof (window as any).Chart !== 'undefined',
          { timeout: 10000 }
        );
        console.log('Chart.js loaded successfully');
      } catch (e) {
        console.warn('Chart.js did not load from CDN, continuing without charts:', e);
      }

      // Wait a bit for any async operations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for charts to render (if Chart.js is available)
      try {
        await page.evaluate(() => {
          return new Promise<void>((resolve) => {
            // Check if Chart.js is available
            if (typeof (window as any).Chart !== 'undefined') {
              // Wait for all canvas elements to be ready
              const canvases = document.querySelectorAll('canvas');
              if (canvases.length > 0) {
                // Give charts time to render
                setTimeout(() => resolve(), 2000);
              } else {
                resolve();
              }
            } else {
              // No Chart.js, just resolve
              resolve();
            }
          });
        });
      } catch (e) {
        console.warn('Error waiting for charts:', e);
        // Continue anyway
      }

      console.log('Generating PDF...');

      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        preferCSSPageSize: false
      });

      console.log('PDF generated, size:', pdf?.length || 0, 'bytes');

      // Validate PDF was generated
      if (!pdf) {
        throw new Error('PDF generation returned null');
      }

      if (pdf.length === 0) {
        throw new Error('Generated PDF is empty (0 bytes)');
      }

      if (pdf.length < 1000) {
        // Log the first few bytes to see what we got
        const preview = Buffer.from(pdf.slice(0, Math.min(100, pdf.length))).toString('utf8');
        console.error('PDF preview (first 100 bytes):', preview);
        throw new Error(`Generated PDF is too small (${pdf.length} bytes), likely corrupted. Preview: ${preview.substring(0, 50)}`);
      }

      // Verify it's actually a PDF (should start with %PDF)
      // Check raw bytes: % = 0x25 (37), P = 0x50 (80), D = 0x44 (68), F = 0x46 (70)
      const pdfHeaderBytes = Buffer.from(pdf.slice(0, 4));
      const expectedHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
      if (!pdfHeaderBytes.equals(expectedHeader)) {
        const headerStr = pdfHeaderBytes.toString('ascii');
        const headerHex = Array.from(pdfHeaderBytes).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ');
        throw new Error(`Generated file does not appear to be a valid PDF. Header bytes: ${headerHex}, as string: ${headerStr}`);
      }

      console.log('PDF validation passed, size:', pdf.length, 'bytes');
      
      // Ensure we return a Buffer (Puppeteer may return Uint8Array)
      const pdfBuffer = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
      console.log('PDF buffer type:', Buffer.isBuffer(pdfBuffer) ? 'Buffer' : typeof pdfBuffer);
      
      return pdfBuffer;
    } catch (error) {
      console.error('PDF generation error:', error);
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
   * Generate HTML template with charts
   */
  private static generateHtml(options: PdfOptions): string {
    const { surveyName, collectorName, summaries, generatedAt } = options;

    const chartScripts = this.generateChartScripts(summaries);
    const questionSections = summaries.map((summary, idx) => 
      this.generateQuestionSection(summary, idx)
    ).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(surveyName)} - Summary Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" crossorigin="anonymous"></script>
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
    
    .header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 3px solid #2563eb;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    
    .header .subtitle {
      font-size: 16px;
      color: #64748b;
    }
    
    .header .meta {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 8px;
    }
    
    .question-section {
      page-break-inside: avoid;
      margin-bottom: 40px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }
    
    .question-header {
      margin-bottom: 20px;
    }
    
    .question-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }
    
    .question-stats {
      display: flex;
      gap: 20px;
      font-size: 14px;
      color: #64748b;
    }
    
    .question-stats span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    
    .chart-container {
      margin: 20px 0;
      position: relative;
      height: 300px;
      background: white;
      border-radius: 6px;
      padding: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .table-container {
      margin-top: 20px;
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    thead {
      background: #f1f5f9;
    }
    
    th {
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    td {
      padding: 12px 16px;
      font-size: 14px;
      color: #334155;
      border-top: 1px solid #e2e8f0;
    }
    
    tbody tr:hover {
      background: #f8fafc;
    }
    
    .percentage {
      font-weight: 600;
      color: #2563eb;
    }
    
    .count {
      font-weight: 600;
      color: #64748b;
    }
    
    .total-row {
      background: #f1f5f9;
      font-weight: 600;
    }
    
    .total-row td {
      border-top: 2px solid #cbd5e1;
      padding-top: 16px;
      padding-bottom: 16px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    
    @media print {
      .question-section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${this.escapeHtml(surveyName)}</h1>
    <div class="subtitle">${this.escapeHtml(collectorName)} - Summary Report</div>
    <div class="meta">Generated on ${generatedAt.toLocaleDateString()} at ${generatedAt.toLocaleTimeString()}</div>
  </div>
  
  ${questionSections}
  
  <div class="footer">
    <p>This report was generated automatically by the Survey Analytics System</p>
  </div>
  
  ${chartScripts}
</body>
</html>
    `;
  }

  /**
   * Generate question section HTML
   */
  private static generateQuestionSection(summary: QuestionSummary, index: number): string {
    const chartId = `chart-${index}`;
    const hasData = summary.answerDistribution.length > 0;
    
    // Determine chart type based on question type
    const chartType = this.getChartType(summary);
    
    const tableRows = summary.answerDistribution.map(dist => `
      <tr>
        <td>${this.escapeHtml(dist.label)}</td>
        <td class="percentage">${dist.percentage.toFixed(2)}%</td>
        <td class="count">${dist.count}</td>
      </tr>
    `).join('');

    return `
      <div class="question-section">
        <div class="question-header">
          <div class="question-title">${this.escapeHtml(summary.questionText)}</div>
          <div class="question-stats">
            <span>✓ Answered: ${summary.totalAnswered}</span>
            <span>✗ Skipped: ${summary.totalSkipped}</span>
          </div>
        </div>
        
        ${hasData ? `
          <div class="chart-container">
            <canvas id="${chartId}"></canvas>
          </div>
        ` : ''}
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Answer Choice</th>
                <th style="text-align: right;">Response Percent</th>
                <th style="text-align: right;">Responses</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td style="text-align: right;"></td>
                <td style="text-align: right;"><strong>${summary.totalAnswered}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Generate Chart.js scripts for all questions
   */
  private static generateChartScripts(summaries: QuestionSummary[]): string {
    const scripts = summaries.map((summary, index) => {
      if (summary.answerDistribution.length === 0) return '';
      
      const chartId = `chart-${index}`;
      const chartType = this.getChartType(summary);
      const chartConfig = this.getChartConfig(summary, chartType);
      
      // Escape the chart config JSON to prevent XSS
      const chartConfigJson = JSON.stringify(chartConfig).replace(/</g, '\\u003c');
      
      return `
        <script>
          (function() {
            try {
              if (typeof Chart === 'undefined') {
                console.warn('Chart.js not loaded for chart ${chartId}');
                return;
              }
              const ctx = document.getElementById('${chartId}');
              if (!ctx) {
                console.warn('Canvas element ${chartId} not found');
                return;
              }
              new Chart(ctx, ${chartConfigJson});
            } catch (error) {
              console.error('Error creating chart ${chartId}:', error);
            }
          })();
        </script>
      `;
    }).join('');

    return scripts;
  }

  /**
   * Determine chart type based on question type
   */
  private static getChartType(summary: QuestionSummary): 'bar' | 'pie' | 'doughnut' | 'horizontalBar' {
    // Use doughnut for single/multiple choice with few options
    if (summary.answerDistribution.length <= 6 && 
        (summary.questionType === 'SINGLE_CHOICE' || summary.questionType === 'MULTIPLE_CHOICE')) {
      return 'doughnut';
    }
    
    // Use horizontal bar for multiple choice with many options
    if (summary.questionType === 'MULTIPLE_CHOICE' && summary.answerDistribution.length > 6) {
      return 'horizontalBar';
    }
    
    // Use bar for rating scales
    if (summary.questionType.includes('RATING') || summary.questionType.includes('SCALE')) {
      return 'bar';
    }
    
    // Default to doughnut for most questions
    return 'doughnut';
  }

  /**
   * Get Chart.js configuration
   */
  private static getChartConfig(summary: QuestionSummary, chartType: string): any {
    const labels = summary.answerDistribution.map(d => d.label);
    const data = summary.answerDistribution.map(d => d.count);
    const percentages = summary.answerDistribution.map(d => d.percentage.toFixed(1) + '%');
    
    const colors = this.generateColors(summary.answerDistribution.length);

    const baseConfig: any = {
      type: chartType === 'horizontalBar' ? 'bar' : chartType,
      data: {
        labels: labels,
        datasets: [{
          label: 'Responses',
          data: data,
          backgroundColor: colors,
          borderColor: colors.map(c => this.darkenColor(c)),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: chartType === 'doughnut' || chartType === 'pie' ? 'bottom' : 'top',
            labels: {
              padding: 15,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || '';
                const value = context.parsed.y !== undefined ? context.parsed.y : 
                             (context.parsed !== undefined ? context.parsed : context.raw);
                const percentage = percentages[context.dataIndex];
                return `${label}: ${value} (${percentage})`;
              }
            }
          }
        }
      }
    };

    // For horizontal bar charts
    if (chartType === 'horizontalBar') {
      baseConfig.options.indexAxis = 'y';
      baseConfig.options.scales = {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: {
              size: 11
            }
          }
        },
        y: {
          ticks: {
            font: {
              size: 11
            }
          }
        }
      };
    } else if (chartType === 'bar') {
      baseConfig.options.scales = {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: {
              size: 11
            }
          }
        },
        x: {
          ticks: {
            font: {
              size: 11
            }
          }
        }
      };
    }

    return baseConfig;
  }

  /**
   * Generate color palette
   */
  private static generateColors(count: number): string[] {
    const palette = [
      '#3b82f6', // Blue
      '#10b981', // Green
      '#f59e0b', // Orange
      '#ef4444', // Red
      '#8b5cf6', // Purple
      '#06b6d4', // Cyan
      '#f97316', // Orange-red
      '#84cc16', // Lime
      '#ec4899', // Pink
      '#6366f1', // Indigo
      '#14b8a6', // Teal
      '#f43f5e'  // Rose
    ];

    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      const color = palette[i % palette.length];
      if (color) {
        colors.push(color);
      }
    }
    return colors;
  }

  /**
   * Darken color for borders
   */
  private static darkenColor(color: string): string {
    // Simple darkening - convert hex to RGB, reduce brightness
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 30);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 30);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 30);
    return `rgb(${r}, ${g}, ${b})`;
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


