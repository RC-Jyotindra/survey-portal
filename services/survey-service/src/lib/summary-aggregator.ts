/**
 * Summary Aggregator
 * 
 * Processes survey questions and answers to calculate summary statistics
 * for CSV export. Handles all question types and formats data for summary view.
 */

interface QuestionSummary {
  questionId: string;
  questionNumber: number;
  questionText: string;
  questionType: string;
  totalAnswered: number;
  totalSkipped: number;
  totalResponses: number;
  answerDistribution: AnswerDistribution[];
  npsMetrics?: NPSMetrics;
  items?: Array<{ id: string; label: string }>;
  scales?: Array<{ id: string; label: string }>;
}

interface AnswerDistribution {
  label: string;
  count: number;
  percentage: number;
}

interface NPSMetrics {
  detractors: number;
  passives: number;
  promoters: number;
  netPromoterScore: number;
}

interface Answer {
  questionId: string;
  choices?: string[];
  textValue?: string | null;
  numericValue?: number | null;
  booleanValue?: boolean | null;
  jsonValue?: any;
}

interface Question {
  id: string;
  index: number;
  titleTemplate: string | null;
  variableName: string | null;
  type: string;
  items?: Array<{ id: string; label: string; value?: string | number | null }>;
  scales?: Array<{ id: string; label: string; value?: string | number | null }>;
  options?: Array<{ id: string; value: string; labelTemplate: string | null }>;
}

export class SummaryAggregator {
  /**
   * Process questions and answers to generate summary statistics
   */
  static aggregate(
    questions: Question[],
    allAnswers: Answer[],
    totalSessions: number
  ): QuestionSummary[] {
    return questions.map((question, idx) => {
      const questionAnswers = allAnswers.filter(a => a.questionId === question.id);
      const answeredCount = questionAnswers.length;
      const skippedCount = totalSessions - answeredCount;

      let answerDistribution: AnswerDistribution[] = [];
      let npsMetrics: NPSMetrics | undefined;

      // Process based on question type
      if (this.isNPSQuestion(question.type)) {
        const result = this.processNPS(questionAnswers, question);
        answerDistribution = result.distribution;
        npsMetrics = result.nps;
      } else if (this.isMatrixQuestion(question.type)) {
        answerDistribution = this.processMatrix(questionAnswers, question);
      } else if (this.isMultipleChoice(question.type)) {
        answerDistribution = this.processMultipleChoice(questionAnswers, question, answeredCount);
      } else if (this.isSingleChoice(question.type)) {
        answerDistribution = this.processSingleChoice(questionAnswers, question, answeredCount);
      } else if (this.isRatingQuestion(question.type)) {
        answerDistribution = this.processRating(questionAnswers, question, answeredCount);
      } else if (this.isTextQuestion(question.type)) {
        answerDistribution = this.processText(questionAnswers, question);
      } else {
        // Generic fallback
        answerDistribution = this.processGeneric(questionAnswers, question);
      }

      return {
        questionId: question.id,
        questionNumber: idx + 1,
        questionText: question.titleTemplate || question.variableName || `Question ${question.index}`,
        questionType: question.type,
        totalAnswered: answeredCount,
        totalSkipped: skippedCount,
        totalResponses: totalSessions,
        answerDistribution,
        npsMetrics,
        items: question.items,
        scales: question.scales
      };
    });
  }

  /**
   * Check if question is NPS type (0-10 scale)
   */
  private static isNPSQuestion(type: string): boolean {
    return type === 'NPS' || type === 'RATING_SCALE';
  }

  /**
   * Check if question is matrix type
   */
  private static isMatrixQuestion(type: string): boolean {
    return ['MATRIX_SINGLE', 'MATRIX_MULTIPLE', 'BIPOLAR_MATRIX', 'LIKERT_SCALE', 'SIDE_BY_SIDE_MATRIX'].includes(type);
  }

  /**
   * Check if question is multiple choice
   */
  private static isMultipleChoice(type: string): boolean {
    return type === 'MULTIPLE_CHOICE';
  }

  /**
   * Check if question is single choice
   */
  private static isSingleChoice(type: string): boolean {
    return ['SINGLE_CHOICE', 'DROPDOWN', 'RADIO'].includes(type);
  }

  /**
   * Check if question is rating type
   */
  private static isRatingQuestion(type: string): boolean {
    return ['STAR_RATING', 'SMILEY_RATING', 'SLIDER', 'CATEGORICAL_SLIDER'].includes(type);
  }

  /**
   * Check if question is text type
   */
  private static isTextQuestion(type: string): boolean {
    return ['TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'URL', 'NUMBER', 'DATE', 'TIME'].includes(type);
  }

  /**
   * Process NPS questions (0-10 scale)
   */
  private static processNPS(
    answers: Answer[],
    question: Question
  ): { distribution: AnswerDistribution[]; nps: NPSMetrics } {
    const distribution = new Map<string, { count: number; score: number }>();
    let detractors = 0;
    let passives = 0;
    let promoters = 0;

    answers.forEach(answer => {
      let score: number | null = null;

      if (answer.numericValue !== null && answer.numericValue !== undefined) {
        score = answer.numericValue;
      } else if (answer.choices && answer.choices.length > 0) {
        const firstChoice = answer.choices[0];
        if (firstChoice) {
          const num = parseInt(firstChoice);
          if (!isNaN(num)) score = num;
        }
      }

      if (score !== null && score >= 0 && score <= 10) {
        const key = score.toString();
        const existing = distribution.get(key) || { count: 0, score };
        existing.count++;
        distribution.set(key, existing);

        // Categorize for NPS
        if (score >= 0 && score <= 6) detractors++;
        else if (score >= 7 && score <= 8) passives++;
        else if (score >= 9 && score <= 10) promoters++;
      }
    });

    const total = answers.length;
    const distributionArray: AnswerDistribution[] = Array.from(distribution.entries())
      .map(([label, data]) => ({
        label,
        count: data.count,
        percentage: total > 0 ? (data.count / total) * 100 : 0
      }))
      .sort((a, b) => parseInt(a.label) - parseInt(b.label));

    const netPromoterScore = total > 0 ? ((promoters - detractors) / total) * 100 : 0;

    return {
      distribution: distributionArray,
      nps: {
        detractors,
        passives,
        promoters,
        netPromoterScore: Math.round(netPromoterScore * 100) / 100
      }
    };
  }

  /**
   * Process matrix questions
   * jsonValue structure: { [itemId]: scaleId } for single selection
   *                      { [itemId]: [scaleId1, scaleId2, ...] } for multiple selection
   */
  private static processMatrix(answers: Answer[], question: Question): AnswerDistribution[] {
    const distribution = new Map<string, number>();
    const items = question.items || [];
    const scales = question.scales || [];

    // Initialize all item-scale combinations
    items.forEach(item => {
      scales.forEach(scale => {
        const key = `${item.label} - ${scale.label}`;
        distribution.set(key, 0);
      });
    });

    // Count selections - match the logic from exportCollectorResponsesHandler
    answers.forEach(answer => {
      if (answer.jsonValue && typeof answer.jsonValue === 'object' && !Array.isArray(answer.jsonValue)) {
        const matrixData = answer.jsonValue as Record<string, any>;
        
        items.forEach(item => {
          const itemValue = matrixData[item.id];
          
          if (itemValue !== null && itemValue !== undefined && itemValue !== '') {
            if (Array.isArray(itemValue)) {
              // Multiple selection - check if scale.id is in the array
              scales.forEach(scale => {
                if (itemValue.includes(scale.id)) {
                  const key = `${item.label} - ${scale.label}`;
                  distribution.set(key, (distribution.get(key) || 0) + 1);
                }
              });
            } else {
              // Single selection - check if itemValue matches scale.id
              scales.forEach(scale => {
                // Try exact match first (most common case)
                if (itemValue === scale.id || String(itemValue) === String(scale.id)) {
                  const key = `${item.label} - ${scale.label}`;
                  distribution.set(key, (distribution.get(key) || 0) + 1);
                } 
                // Fallback: try matching by value field
                else if (scale.value !== null && scale.value !== undefined) {
                  if (itemValue === scale.value || String(itemValue) === String(scale.value)) {
                    const key = `${item.label} - ${scale.label}`;
                    distribution.set(key, (distribution.get(key) || 0) + 1);
                  }
                }
              });
            }
          }
        });
      }
    });

    const total = answers.length;
    return Array.from(distribution.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Process multiple choice questions
   */
  private static processMultipleChoice(
    answers: Answer[],
    question: Question,
    totalAnswered: number
  ): AnswerDistribution[] {
    const distribution = new Map<string, number>();
    const options = question.options || [];

    // Initialize all options
    options.forEach(option => {
      const label = option.labelTemplate || option.value;
      distribution.set(label, 0);
    });

    // Count selections (each answer can have multiple choices)
    answers.forEach(answer => {
      if (answer.choices && answer.choices.length > 0) {
        answer.choices.forEach(choice => {
          const option = options.find(opt => opt.value === choice || opt.id === choice);
          if (option) {
            const label = option.labelTemplate || option.value;
            distribution.set(label, (distribution.get(label) || 0) + 1);
          } else {
            // Fallback: use choice value directly
            distribution.set(choice, (distribution.get(choice) || 0) + 1);
          }
        });
      }
    });

    // For multiple choice, percentage is based on number of respondents who selected each option
    return Array.from(distribution.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: totalAnswered > 0 ? (count / totalAnswered) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Process single choice questions
   */
  private static processSingleChoice(
    answers: Answer[],
    question: Question,
    totalAnswered: number
  ): AnswerDistribution[] {
    const distribution = new Map<string, number>();
    const options = question.options || [];

    // Initialize all options
    options.forEach(option => {
      const label = option.labelTemplate || option.value;
      distribution.set(label, 0);
    });

    // Count selections
    answers.forEach(answer => {
      if (answer.choices && answer.choices.length > 0) {
        const choice = answer.choices[0];
        const option = options.find(opt => opt.value === choice || opt.id === choice);
        if (option) {
          const label = option.labelTemplate || option.value;
          distribution.set(label, (distribution.get(label) || 0) + 1);
        } else {
          // Fallback: use choice value directly
          if (choice) {
            distribution.set(choice, (distribution.get(choice) || 0) + 1);
          }
        }
      }
    });

    return Array.from(distribution.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: totalAnswered > 0 ? (count / totalAnswered) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Process rating questions
   */
  private static processRating(
    answers: Answer[],
    question: Question,
    totalAnswered: number
  ): AnswerDistribution[] {
    const distribution = new Map<string, number>();
    const options = question.options || [];

    // Initialize all options
    options.forEach(option => {
      const label = option.labelTemplate || option.value;
      distribution.set(label, 0);
    });

    // Count selections
    answers.forEach(answer => {
      if (answer.numericValue !== null && answer.numericValue !== undefined) {
        const option = options.find(opt => 
          opt.value === answer.numericValue?.toString() || 
          parseInt(opt.value) === answer.numericValue
        );
        if (option) {
          const label = option.labelTemplate || option.value;
          distribution.set(label, (distribution.get(label) || 0) + 1);
        } else {
          // Fallback: use numeric value directly
          distribution.set(answer.numericValue.toString(), (distribution.get(answer.numericValue.toString()) || 0) + 1);
        }
      } else if (answer.choices && answer.choices.length > 0) {
        const choice = answer.choices[0];
        const option = options.find(opt => opt.value === choice || opt.id === choice);
        if (option) {
          const label = option.labelTemplate || option.value;
          distribution.set(label, (distribution.get(label) || 0) + 1);
        }
      }
    });

    return Array.from(distribution.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: totalAnswered > 0 ? (count / totalAnswered) * 100 : 0
      }))
      .sort((a, b) => {
        // Try to sort by numeric value if possible
        const aNum = parseInt(a.label);
        const bNum = parseInt(b.label);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return b.count - a.count;
      });
  }

  /**
   * Process text questions (group similar responses)
   */
  private static processText(answers: Answer[], question: Question): AnswerDistribution[] {
    // For text questions, we'll show a summary
    const distribution = new Map<string, number>();

    answers.forEach(answer => {
      const text = answer.textValue || '';
      if (text.trim()) {
        // Group exact matches
        distribution.set(text, (distribution.get(text) || 0) + 1);
      }
    });

    const total = answers.length;
    return Array.from(distribution.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Limit to top 20 responses
  }

  /**
   * Process generic/unknown question types
   */
  private static processGeneric(answers: Answer[], question: Question): AnswerDistribution[] {
    const distribution = new Map<string, number>();

    answers.forEach(answer => {
      let value = '';
      if (answer.choices && answer.choices.length > 0) {
        value = answer.choices.join(', ');
      } else if (answer.textValue) {
        value = answer.textValue;
      } else if (answer.numericValue !== null && answer.numericValue !== undefined) {
        value = answer.numericValue.toString();
      } else if (answer.booleanValue !== null) {
        value = answer.booleanValue ? 'Yes' : 'No';
      } else if (answer.jsonValue) {
        value = JSON.stringify(answer.jsonValue);
      }

      if (value) {
        distribution.set(value, (distribution.get(value) || 0) + 1);
      }
    });

    const total = answers.length;
    return Array.from(distribution.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }
}

export type { QuestionSummary, AnswerDistribution, NPSMetrics };


