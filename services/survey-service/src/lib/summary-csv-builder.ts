/**
 * Summary CSV Builder
 * 
 * Formats question summaries into CSV format matching the Excel template:
 * - Title row with survey name
 * - Blank rows for spacing
 * - Question sections with headers
 * - Answer choices with percentages and counts
 * - Answered/Skipped totals
 */

import { QuestionSummary, AnswerDistribution, NPSMetrics } from './summary-aggregator';

export class SummaryCsvBuilder {
  /**
   * Build CSV content from question summaries
   */
  static build(
    surveyName: string,
    collectorName: string,
    summaries: QuestionSummary[]
  ): string {
    const rows: string[][] = [];

    // Title row
    rows.push([`${surveyName} - ${collectorName}`]);
    rows.push([]); // Blank row

    // Process each question
    summaries.forEach((summary, idx) => {
      // Question header
      rows.push([`Q${summary.questionNumber}. ${summary.questionText}`]);

      // Special handling for NPS questions
      if (summary.npsMetrics) {
        // NPS header row (format: Detractors (0-6) | Passives (7-8) | Promoters (9-10) | Net Promoter Score)
        rows.push(['Detractors (0-6)', 'Passives (7-8)', 'Promoters (9-10)', 'Net Promoter Score']);
        // NPS values row
        rows.push([
          summary.npsMetrics.detractors.toString(),
          summary.npsMetrics.passives.toString(),
          summary.npsMetrics.promoters.toString(),
          summary.npsMetrics.netPromoterScore.toString()
        ]);
        // Don't add blank row here - continue with answer distribution if available
      }

      // Answer distribution header (only if we have distribution data)
      if (summary.answerDistribution.length > 0) {
        rows.push(['Answer Choice', 'Response Percent', 'Responses']);

        // Answer rows
        summary.answerDistribution.forEach(dist => {
          const percentage = this.formatPercentage(dist.percentage);
          rows.push([
            dist.label,
            percentage,
            dist.count.toString()
          ]);
        });
      }

      // Answered/Skipped totals
      rows.push([]); // Blank row before totals
      rows.push(['', 'Answered', summary.totalAnswered.toString()]);
      rows.push(['', 'Skipped', summary.totalSkipped.toString()]);

      // Blank row between questions (except last)
      if (idx < summaries.length - 1) {
        rows.push([]);
      }
    });

    // Convert to CSV format
    return rows
      .map(row => {
        // Ensure row has at least 3 columns for proper formatting
        const paddedRow = [...row, '', ''].slice(0, 3);
        return paddedRow.map(cell => this.escapeCsvCell(cell || '')).join(',');
      })
      .join('\n');
  }

  /**
   * Format percentage to 2 decimal places (e.g., 50.00%)
   */
  private static formatPercentage(value: number): string {
    // Ensure we have exactly 2 decimal places
    const rounded = Math.round(value * 100) / 100;
    return `${rounded.toFixed(2)}%`;
  }

  /**
   * Escape CSV cell content
   */
  private static escapeCsvCell(value: string): string {
    if (value === null || value === undefined) {
      return '""';
    }

    const str = String(value);
    
    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    // Otherwise, wrap in quotes for consistency with Excel
    return `"${str}"`;
  }
}


