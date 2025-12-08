import { LoopContext } from './runtime-engine';

/**
 * Template Resolver for Loop Variables
 * Handles resolution of {{loop.*}} variables in survey templates
 */
export class LoopTemplateResolver {
  private loopContext: LoopContext | null = null;

  constructor(loopContext?: LoopContext) {
    this.loopContext = loopContext || null;
  }

  /**
   * Set the current loop context
   */
  setLoopContext(context: LoopContext | null): void {
    this.loopContext = context;
  }

  /**
   * Resolve all template variables including loop variables
   */
  resolveTemplate(
    template: string, 
    context: {
      questionResponses?: Record<string, any>;
      embeddedData?: Record<string, any>;
      loopContext?: LoopContext;
    } = {}
  ): string {
    if (!template) {
      return '';
    }

    let resolved = template;
    const loopContext = context.loopContext || this.loopContext;

    // Resolve loop variables first
    if (loopContext) {
      resolved = this.resolveLoopVariables(resolved, loopContext);
    }

    // Resolve other template variables (existing functionality)
    resolved = this.resolveQuestionVariables(resolved, context.questionResponses || {});
    resolved = this.resolveEmbeddedDataVariables(resolved, context.embeddedData || {});

    return resolved;
  }

  /**
   * Resolve loop-specific variables
   */
  private resolveLoopVariables(template: string, context: LoopContext): string {
    let resolved = template;

    // Basic loop variables
    resolved = resolved.replace(/\{\{loop\.key\}\}/g, context.currentItem.key);
    resolved = resolved.replace(/\{\{loop\.label\}\}/g, context.currentItem.label);
    resolved = resolved.replace(/\{\{loop\.index\}\}/g, String(context.currentIndex + 1));
    resolved = resolved.replace(/\{\{loop\.total\}\}/g, String(context.totalItems));

    // Loop status variables
    resolved = resolved.replace(/\{\{loop\.isFirst\}\}/g, String(context.isFirstIteration));
    resolved = resolved.replace(/\{\{loop\.isLast\}\}/g, String(context.isLastIteration));
    resolved = resolved.replace(/\{\{loop\.isFirstIteration\}\}/g, String(context.isFirstIteration));
    resolved = resolved.replace(/\{\{loop\.isLastIteration\}\}/g, String(context.isLastIteration));

    // Progress variables
    const progress = ((context.currentIndex + 1) / context.totalItems) * 100;
    resolved = resolved.replace(/\{\{loop\.progress\}\}/g, String(Math.round(progress)));
    resolved = resolved.replace(/\{\{loop\.progressPercent\}\}/g, String(progress.toFixed(1)));

    // Custom attributes from the current item
    Object.entries(context.currentItem.attributes).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{loop\\.${this.escapeRegex(key)}\\}\\}`, 'g');
      resolved = resolved.replace(regex, String(value));
    });

    // Nested attribute access (e.g., {{loop.attributes.brand}})
    resolved = resolved.replace(/\{\{loop\.attributes\.([^}]+)\}\}/g, (match, attrKey) => {
      const value = context.currentItem.attributes[attrKey];
      return value !== undefined ? String(value) : match;
    });

    return resolved;
  }

  /**
   * Resolve question response variables (existing functionality)
   */
  private resolveQuestionVariables(template: string, questionResponses: Record<string, any>): string {
    let resolved = template;

    // Pattern: {{answer('Q1')}}
    resolved = resolved.replace(/\{\{answer\('([^']+)'\)\}\}/g, (match, questionVar) => {
      const response = questionResponses[questionVar];
      if (Array.isArray(response)) {
        return response.join(', ');
      }
      return response ? String(response) : '';
    });

    // Pattern: {{Q1}} (direct variable reference)
    resolved = resolved.replace(/\{\{([A-Z]\d+)\}\}/g, (match, questionVar) => {
      const response = questionResponses[questionVar];
      if (Array.isArray(response)) {
        return response.join(', ');
      }
      return response ? String(response) : '';
    });

    return resolved;
  }

  /**
   * Resolve embedded data variables (existing functionality)
   */
  private resolveEmbeddedDataVariables(template: string, embeddedData: Record<string, any>): string {
    let resolved = template;

    // Pattern: {{embeddedData.key}}
    resolved = resolved.replace(/\{\{embeddedData\.([^}]+)\}\}/g, (match, key) => {
      const value = embeddedData[key];
      return value !== undefined ? String(value) : match;
    });

    // Pattern: {{key}} (direct embedded data reference)
    Object.entries(embeddedData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${this.escapeRegex(key)}\\}\\}`, 'g');
      resolved = resolved.replace(regex, String(value));
    });

    return resolved;
  }

  /**
   * Check if a template contains loop variables
   */
  hasLoopVariables(template: string): boolean {
    if (!template) {
      return false;
    }

    const loopVariablePattern = /\{\{loop\.[^}]+\}\}/;
    return loopVariablePattern.test(template);
  }

  /**
   * Get all loop variables used in a template
   */
  getLoopVariables(template: string): string[] {
    if (!template) {
      return [];
    }

    const matches = template.match(/\{\{loop\.[^}]+\}\}/g);
    return matches ? [...new Set(matches)] : [];
  }

  /**
   * Validate that all loop variables in a template are available in the context
   */
  validateLoopVariables(template: string, context: LoopContext): {
    isValid: boolean;
    missingVariables: string[];
  } {
    const variables = this.getLoopVariables(template);
    const missingVariables: string[] = [];

    for (const variable of variables) {
      const varName = variable.replace(/\{\{loop\.|\}\}/g, '');
      
      // Check if it's a basic variable
      if (['key', 'label', 'index', 'total', 'isFirst', 'isLast', 'progress'].includes(varName)) {
        continue;
      }

      // Check if it's an attribute
      if (varName.startsWith('attributes.')) {
        const attrKey = varName.replace('attributes.', '');
        if (!(attrKey in context.currentItem.attributes)) {
          missingVariables.push(variable);
        }
      } else if (!(varName in context.currentItem.attributes)) {
        missingVariables.push(variable);
      }
    }

    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Create a preview of resolved template with sample data
   */
  createPreview(
    template: string, 
    sampleLoopContext?: Partial<LoopContext>
  ): string {
    const defaultContext: LoopContext = {
      currentItem: {
        key: 'sample',
        label: 'Sample Item',
        attributes: {
          brand: 'Sample Brand',
          price: '$9.99',
          category: 'Sample Category'
        }
      },
      currentIndex: 0,
      totalItems: 3,
      isFirstIteration: true,
      isLastIteration: false,
      ...sampleLoopContext
    };

    return this.resolveTemplate(template, { loopContext: defaultContext });
  }

  /**
   * Batch resolve multiple templates
   */
  resolveTemplates(
    templates: Record<string, string>,
    context: {
      questionResponses?: Record<string, any>;
      embeddedData?: Record<string, any>;
      loopContext?: LoopContext;
    } = {}
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, template] of Object.entries(templates)) {
      resolved[key] = this.resolveTemplate(template, context);
    }

    return resolved;
  }
}
