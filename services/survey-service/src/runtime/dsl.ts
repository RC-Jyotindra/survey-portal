/**
 * Expression DSL Evaluation Engine
 * 
 * Evaluates survey logic expressions written in our DSL format.
 * Supports functions like:
 * - answer('Q1') - get answer value for question
 * - anySelected('Q1', ['option1', 'option2']) - check if any options selected
 * - allSelected('Q1', ['option1', 'option2']) - check if all options selected
 * - equals(value1, value2) - equality check
 * - not(value) - negation
 * - and(expr1, expr2) - logical AND
 * - or(expr1, expr2) - logical OR
 * - greaterThan(value1, value2) - numeric comparison
 * - lessThan(value1, value2) - numeric comparison
 * - contains(text, substring) - string contains
 * - isEmpty(value) - check if empty
 * - isNotEmpty(value) - check if not empty
 * - loop.variableName - access loop context variables
 */

export interface EvaluationContext {
  answers: Map<string, any>;
  loopContext?: Map<string, any>;
  additionalContext?: any;
  questionIdMap?: Map<string, string>;
}

/**
 * Process pipe expressions in text (e.g., ${pipe:question:Q2:response})
 */
export function processPipeExpressions(
  text: string,
  answers: Map<string, any>,
  loopContext?: Map<string, any>,
  questionIdMap?: Map<string, string> // Map from variableName (Q2) to actual question ID (UUID)
): string {
  if (!text || typeof text !== 'string') return text;

  // Debug logging
  // console.log('🔍 Processing pipe expressions:', { text, answersSize: answers.size });

  // Match ${pipe:question:Q2:response} patterns
  const pipeRegex = /\$\{pipe:question:([^:]+):([^}]+)\}/g;
  
  return text.replace(pipeRegex, (match, questionVariable, field) => {
    // console.log('🔍 Found pipe expression:', { match, questionVariable, field });
    // console.log('🔍 Available answer keys:', Array.from(answers.keys()));
    
    // Try to find the answer using the variable name (Q2) or direct ID
    let answer = answers.get(questionVariable);
    
    // If not found and we have a question ID map, try to map the variable name to actual ID
    if (!answer && questionIdMap) {
      const actualQuestionId = questionIdMap.get(questionVariable);
      if (actualQuestionId) {
        // console.log('🔍 Mapping variable name to actual ID:', { questionVariable, actualQuestionId });
        answer = answers.get(actualQuestionId);
      }
    }
    
    // console.log('🔍 Answer found:', { questionVariable, answer });
    if (!answer) {
      // console.log('❌ No answer found for questionVariable:', questionVariable);
      return match; // Return original if no answer found
    }

    // Handle different field types
    switch (field) {
      case 'response':
      case 'text':
        if (answer.textValue) return answer.textValue;
        if (answer.choices && answer.choices.length > 0) return answer.choices.join(', ');
        if (answer.numericValue !== null) return answer.numericValue.toString();
        if (answer.booleanValue !== null) return answer.booleanValue.toString();
        return match; // Return original if no value found
        
      case 'choices':
        if (answer.choices && answer.choices.length > 0) return answer.choices.join(', ');
        return match;
        
      case 'numeric':
        if (answer.numericValue !== null) return answer.numericValue.toString();
        return match;
        
      case 'boolean':
        if (answer.booleanValue !== null) return answer.booleanValue.toString();
        return match;
        
      default:
        return match; // Return original for unknown fields
    }
  });
}

export async function evaluateExpression(
  dsl: string,
  answers: Map<string, any>,
  loopContext?: Map<string, any>,
  additionalContext?: any,
  questionIdMap?: Map<string, string>
): Promise<boolean> {
  console.log(`[DSL_EVAL] evaluateExpression: '${dsl}'`);
  
  if (!dsl || dsl.trim() === '') {
    console.log(`[DSL_EVAL] Empty DSL, returning true`);
    return true;
  }

  const context: EvaluationContext = {
    answers,
    loopContext,
    additionalContext,
    questionIdMap
  };

  try {
    const result = await evaluateNode(dsl.trim(), context);
    const booleanResult = Boolean(result);
    console.log(`[DSL_EVAL] evaluateExpression result: ${booleanResult}`);
    return booleanResult;
  } catch (error) {
    console.error('[DSL_EVAL] DSL evaluation error:', error, 'DSL:', dsl);
    return false;
  }
}

async function evaluateNode(expression: string, context: EvaluationContext): Promise<any> {
  expression = expression.trim();

  // Handle parentheses and function calls
  if (expression.startsWith('(') && expression.endsWith(')')) {
    return await evaluateNode(expression.slice(1, -1), context);
  }

  // Handle function calls
  const functionMatch = expression.match(/^(\w+)\s*\(/);
  if (functionMatch && functionMatch[1]) {
    const functionName = functionMatch[1];
    const args = parseFunctionArguments(expression.slice(functionName.length + 1, -1));
    
    return await evaluateFunction(functionName, args, context);
  }

  // Handle string literals
  if (expression.startsWith("'") && expression.endsWith("'")) {
    return expression.slice(1, -1);
  }

  if (expression.startsWith('"') && expression.endsWith('"')) {
    return expression.slice(1, -1);
  }

  // Handle numeric literals
  if (/^-?\d+(\.\d+)?$/.test(expression)) {
    return parseFloat(expression);
  }

  // Handle boolean literals
  if (expression === 'true') return true;
  if (expression === 'false') return false;

  // Handle array literals
  if (expression.startsWith('[') && expression.endsWith(']')) {
    const arrayContent = expression.slice(1, -1).trim();
    console.log(`[DSL_EVAL] Parsing array literal: '${expression}', content: '${arrayContent}'`);
    
    if (!arrayContent) return [];
    
    const elements = parseFunctionArguments(arrayContent);
    console.log(`[DSL_EVAL] Array elements:`, elements);
    
    const result = await Promise.all(elements.map(element => evaluateNode(element, context)));
    console.log(`[DSL_EVAL] Array result:`, result);
    return result;
  }

  // Handle variable references (loop context)
  if (expression.startsWith('loop.')) {
    const variableName = expression.slice(5);
    return context.loopContext?.get(variableName);
  }

  // Handle question references (answer function)
  if (expression.startsWith('Q') || /^[A-Z]\d+$/.test(expression)) {
    return getAnswerValue(expression, context);
  }

  // Handle additional context variables
  if (context.additionalContext && expression in context.additionalContext) {
    return context.additionalContext[expression];
  }

  return expression;
}

function parseFunctionArguments(argsString: string): string[] {
  console.log(`[DSL_EVAL] parseFunctionArguments input: '${argsString}'`);
  
  if (!argsString.trim()) return [];
  
  const args: string[] = [];
  let current = '';
  let depth = 0;
  let arrayDepth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];
    
    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
      current += char;
    } else if (inString && char === stringChar) {
      inString = false;
      stringChar = '';
      current += char;
    } else if (!inString && char === '(') {
      depth++;
      current += char;
    } else if (!inString && char === ')') {
      depth--;
      current += char;
    } else if (!inString && char === '[') {
      arrayDepth++;
      current += char;
    } else if (!inString && char === ']') {
      arrayDepth--;
      current += char;
    } else if (!inString && char === ',' && depth === 0 && arrayDepth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    args.push(current.trim());
  }
  
  console.log(`[DSL_EVAL] parseFunctionArguments result:`, args);
  return args;
}

async function evaluateFunction(
  functionName: string,
  args: string[],
  context: EvaluationContext
): Promise<any> {
  console.log(`[DSL_EVAL] evaluateFunction: ${functionName}(${args.join(', ')})`);
  
  const evaluatedArgs = await Promise.all(
    args.map(arg => evaluateNode(arg, context))
  );

  console.log(`[DSL_EVAL] evaluatedArgs for ${functionName}:`, evaluatedArgs);

  switch (functionName) {
    case 'answer':
      return getAnswerValue(evaluatedArgs[0], context);
    
    case 'anySelected':
      return anySelected(evaluatedArgs[0], evaluatedArgs[1], context);
    
    case 'allSelected':
      return allSelected(evaluatedArgs[0], evaluatedArgs[1], context);
    
    case 'noneSelected':
      return noneSelected(evaluatedArgs[0], evaluatedArgs[1], context);
    
    case 'equals':
      return equals(evaluatedArgs[0], evaluatedArgs[1]);
    
    case 'notEquals':
      return !equals(evaluatedArgs[0], evaluatedArgs[1]);
    
    case 'not':
      return !evaluatedArgs[0];
    
    case 'and':
      return evaluatedArgs.every(arg => Boolean(arg));
    
    case 'or':
      return evaluatedArgs.some(arg => Boolean(arg));
    
    case 'greaterThan':
      return Number(evaluatedArgs[0]) > Number(evaluatedArgs[1]);
    
    case 'lessThan':
      return Number(evaluatedArgs[0]) < Number(evaluatedArgs[1]);
    
    case 'greaterThanOrEqual':
      return Number(evaluatedArgs[0]) >= Number(evaluatedArgs[1]);
    
    case 'lessThanOrEqual':
      return Number(evaluatedArgs[0]) <= Number(evaluatedArgs[1]);
    
    case 'contains':
      return String(evaluatedArgs[0]).includes(String(evaluatedArgs[1]));
    
    case 'isEmpty':
      return isEmpty(evaluatedArgs[0]);
    
    case 'isNotEmpty':
      return !isEmpty(evaluatedArgs[0]);
    
    case 'length':
      return getLength(evaluatedArgs[0]);
    
    case 'in':
      return inArray(evaluatedArgs[0], evaluatedArgs[1]);
    
    case 'notIn':
      return !inArray(evaluatedArgs[0], evaluatedArgs[1]);
    
    case 'startsWith':
      return String(evaluatedArgs[0]).startsWith(String(evaluatedArgs[1]));
    
    case 'endsWith':
      return String(evaluatedArgs[0]).endsWith(String(evaluatedArgs[1]));
    
    case 'regex':
      return regexMatch(evaluatedArgs[0], evaluatedArgs[1]);
    
    case 'between':
      return between(evaluatedArgs[0], evaluatedArgs[1], evaluatedArgs[2]);
    
    case 'isNumber':
      return !isNaN(Number(evaluatedArgs[0]));
    
    case 'isString':
      return typeof evaluatedArgs[0] === 'string';
    
    case 'isArray':
      return Array.isArray(evaluatedArgs[0]);
    
    case 'count':
      return count(evaluatedArgs[0]);
    
    case 'sum':
      return sum(evaluatedArgs[0]);
    
    case 'average':
      return average(evaluatedArgs[0]);
    
    case 'min':
      return min(evaluatedArgs[0]);
    
    case 'max':
      return max(evaluatedArgs[0]);
    
    default:
      console.warn(`Unknown function: ${functionName}`);
      return false;
  }
}

function getAnswerValue(questionId: string, context: EvaluationContext): any {
  console.log(`[DSL_EVAL] getAnswerValue: questionId='${questionId}'`);
  
  // Try to find the answer using the variable name (Q2) or direct ID
  let answer = context.answers.get(questionId);
  let resolvedQuestionId = questionId;
  
  // If not found and we have a question ID map, try to map the variable name to actual ID
  if (!answer && context.questionIdMap) {
    const actualQuestionId = context.questionIdMap.get(questionId);
    if (actualQuestionId) {
      console.log(`[DSL_EVAL] Mapped variable name '${questionId}' -> '${actualQuestionId}'`);
      answer = context.answers.get(actualQuestionId);
      resolvedQuestionId = actualQuestionId;
    }
  }
  
  if (!answer) {
    console.warn(`[DSL_EVAL] No answer found for questionId: '${questionId}' (resolved: '${resolvedQuestionId}')`);
    return null;
  }
  
  console.log(`[DSL_EVAL] Found answer for '${questionId}':`, answer);
  
  // Return the most appropriate value based on answer structure
  if (answer.choices && answer.choices.length > 0) {
    const result = answer.choices.length === 1 ? answer.choices[0] : answer.choices;
    console.log(`[DSL_EVAL] Returning choices: ${JSON.stringify(result)}`);
    return result;
  }
  
  if (answer.textValue !== undefined) {
    console.log(`[DSL_EVAL] Returning textValue: '${answer.textValue}'`);
    return answer.textValue;
  }
  if (answer.numericValue !== undefined) {
    console.log(`[DSL_EVAL] Returning numericValue: ${answer.numericValue}`);
    return answer.numericValue;
  }
  if (answer.decimalValue !== undefined) {
    console.log(`[DSL_EVAL] Returning decimalValue: ${answer.decimalValue}`);
    return Number(answer.decimalValue);
  }
  if (answer.booleanValue !== undefined) {
    console.log(`[DSL_EVAL] Returning booleanValue: ${answer.booleanValue}`);
    return answer.booleanValue;
  }
  if (answer.emailValue !== undefined) {
    console.log(`[DSL_EVAL] Returning emailValue: '${answer.emailValue}'`);
    return answer.emailValue;
  }
  if (answer.phoneValue !== undefined) {
    console.log(`[DSL_EVAL] Returning phoneValue: '${answer.phoneValue}'`);
    return answer.phoneValue;
  }
  if (answer.urlValue !== undefined) {
    console.log(`[DSL_EVAL] Returning urlValue: '${answer.urlValue}'`);
    return answer.urlValue;
  }
  if (answer.dateValue !== undefined) {
    console.log(`[DSL_EVAL] Returning dateValue: ${answer.dateValue}`);
    return answer.dateValue;
  }
  if (answer.timeValue !== undefined) {
    console.log(`[DSL_EVAL] Returning timeValue: ${answer.timeValue}`);
    return answer.timeValue;
  }
  
  console.warn(`[DSL_EVAL] No recognized value type found in answer for '${questionId}'`);
  return null;
}

function anySelected(questionId: string, options: string[], context: EvaluationContext): boolean {
  console.log(`[DSL_EVAL] anySelected: questionId='${questionId}', options=[${options.join(', ')}]`);
  
  // Try to find the answer using the variable name (Q2) or direct ID
  let answer = context.answers.get(questionId);
  let resolvedQuestionId = questionId;
  
  // If not found and we have a question ID map, try to map the variable name to actual ID
  if (!answer && context.questionIdMap) {
    const actualQuestionId = context.questionIdMap.get(questionId);
    if (actualQuestionId) {
      console.log(`[DSL_EVAL] Mapped variable name '${questionId}' -> '${actualQuestionId}'`);
      answer = context.answers.get(actualQuestionId);
      resolvedQuestionId = actualQuestionId;
    }
  }
  
  if (!answer) {
    console.warn(`[DSL_EVAL] No answer found for questionId: '${questionId}' (resolved: '${resolvedQuestionId}')`);
    return false;
  }
  
  if (!answer.choices) {
    console.warn(`[DSL_EVAL] Answer found but no choices property for questionId: '${questionId}', answer:`, answer);
    return false;
  }
  
  const result = options.some(option => answer.choices.includes(option));
  console.log(`[DSL_EVAL] anySelected result: ${result} (choices: [${answer.choices.join(', ')}], options: [${options.join(', ')}])`);
  
  return result;
}

function allSelected(questionId: string, options: string[], context: EvaluationContext): boolean {
  console.log(`[DSL_EVAL] allSelected: questionId='${questionId}', options=[${options.join(', ')}]`);
  
  // Try to find the answer using the variable name (Q2) or direct ID
  let answer = context.answers.get(questionId);
  let resolvedQuestionId = questionId;
  
  // If not found and we have a question ID map, try to map the variable name to actual ID
  if (!answer && context.questionIdMap) {
    const actualQuestionId = context.questionIdMap.get(questionId);
    if (actualQuestionId) {
      console.log(`[DSL_EVAL] Mapped variable name '${questionId}' -> '${actualQuestionId}'`);
      answer = context.answers.get(actualQuestionId);
      resolvedQuestionId = actualQuestionId;
    }
  }
  
  if (!answer) {
    console.warn(`[DSL_EVAL] No answer found for questionId: '${questionId}' (resolved: '${resolvedQuestionId}')`);
    return false;
  }
  
  if (!answer.choices) {
    console.warn(`[DSL_EVAL] Answer found but no choices property for questionId: '${questionId}', answer:`, answer);
    return false;
  }
  
  const result = options.every(option => answer.choices.includes(option));
  console.log(`[DSL_EVAL] allSelected result: ${result} (choices: [${answer.choices.join(', ')}], options: [${options.join(', ')}])`);
  
  return result;
}

function noneSelected(questionId: string, options: string[], context: EvaluationContext): boolean {
  console.log(`[DSL_EVAL] noneSelected: questionId='${questionId}', options=[${options.join(', ')}]`);
  
  // Try to find the answer using the variable name (Q2) or direct ID
  let answer = context.answers.get(questionId);
  let resolvedQuestionId = questionId;
  
  // If not found and we have a question ID map, try to map the variable name to actual ID
  if (!answer && context.questionIdMap) {
    const actualQuestionId = context.questionIdMap.get(questionId);
    if (actualQuestionId) {
      console.log(`[DSL_EVAL] Mapped variable name '${questionId}' -> '${actualQuestionId}'`);
      answer = context.answers.get(actualQuestionId);
      resolvedQuestionId = actualQuestionId;
    }
  }
  
  if (!answer) {
    console.warn(`[DSL_EVAL] No answer found for questionId: '${questionId}' (resolved: '${resolvedQuestionId}')`);
    return false;
  }
  
  if (!answer.choices) {
    console.warn(`[DSL_EVAL] Answer found but no choices property for questionId: '${questionId}', answer:`, answer);
    return false;
  }
  
  const result = !options.some(option => answer.choices.includes(option));
  console.log(`[DSL_EVAL] noneSelected result: ${result} (choices: [${answer.choices.join(', ')}], options: [${options.join(', ')}])`);
  
  return result;
}

function equals(a: any, b: any): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }
  return a === b;
}

function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function getLength(value: any): number {
  if (typeof value === 'string') return value.length;
  if (Array.isArray(value)) return value.length;
  return 0;
}

function inArray(value: any, array: any[]): boolean {
  return Array.isArray(array) && array.includes(value);
}

function regexMatch(value: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern);
    return regex.test(value);
  } catch {
    return false;
  }
}

function between(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function count(value: any): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'string') return value.length;
  return 0;
}

function sum(value: any): number {
  if (Array.isArray(value)) {
    return value.reduce((acc, val) => acc + Number(val || 0), 0);
  }
  return Number(value || 0);
}

function average(value: any): number {
  if (Array.isArray(value) && value.length > 0) {
    return sum(value) / value.length;
  }
  return Number(value || 0);
}

function min(value: any): number {
  if (Array.isArray(value) && value.length > 0) {
    return Math.min(...value.map(v => Number(v || 0)));
  }
  return Number(value || 0);
}

function max(value: any): number {
  if (Array.isArray(value) && value.length > 0) {
    return Math.max(...value.map(v => Number(v || 0)));
  }
  return Number(value || 0);
}


