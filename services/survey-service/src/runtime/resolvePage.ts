/**
 * Page Resolution Engine
 * 
 * Handles the "Resolve" step of the runtime engine:
 * - Evaluate visibility (page/group/question) via Expression.dsl
 * - Apply carry-forward (build options from prior answers)
 * - Apply piping & merge tokens ({{Q1}}, {{loop.brand}})
 * - Compute deterministic order (page/group/question/option)
 * - Persist realized order in SurveySession.renderState
 */

import { PrismaClient } from '@prisma/client';
import { evaluateExpression, processPipeExpressions } from './dsl';
import { getDeterministicRandom } from './random';

export interface ResolvedPage {
  pageId: string;
  title: string;
  description?: string;
  groups: ResolvedGroup[];
  isVisible: boolean;
}

export interface ResolvedGroup {
  id: string;
  title?: string;
  description?: string;
  questions: ResolvedQuestion[];
  isVisible: boolean;
  order: number;
}

export interface ResolvedQuestion {
  id: string;
  variableName: string;
  type: string;
  title: string;
  helpText?: string;
  required: boolean;
  options: ResolvedOption[];
  items?: ResolvedItem[]; // for matrix questions
  scales?: ResolvedScale[]; // for matrix questions
  validation?: any;
  isVisible: boolean;
  order: number;
  // Type-specific config
  minValue?: number;
  maxValue?: number;
  stepValue?: number;
  defaultValue?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  scaleSteps?: number;
  maxSelections?: number;
  allowOther?: boolean;
  otherLabel?: string;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  dateFormat?: string;
  timeFormat?: string;
  minDate?: Date;
  maxDate?: Date;
  phoneFormat?: string;
  countryCode?: string;
  urlProtocol?: string;
  paymentAmount?: number;
  currency?: string;
  paymentMethods?: string[];
  imageLayout?: string;
  imageSize?: string;
  matrixType?: string;
  showHeaders?: boolean;
  randomizeRows?: boolean;
  randomizeColumns?: boolean;
  totalPoints?: number;
  allowZero?: boolean;
  signatureWidth?: number;
  signatureHeight?: number;
  signatureColor?: string;
  consentText?: string;
  requireSignature?: boolean;
  collectName?: boolean;
  collectEmail?: boolean;
  collectPhone?: boolean;
  collectCompany?: boolean;
  collectAddress?: boolean;
  showIpsosBranding?: boolean;
  groupSize?: number;
  groupLabel?: string;
}

export interface ResolvedOption {
  id: string;
  value: string;
  label: string;
  exclusive?: boolean;
  groupKey?: string;
  weight?: number;
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  isVisible: boolean;
  order: number;
}

export interface ResolvedItem {
  id: string;
  value: string;
  label: string;
  isVisible: boolean;
  order: number;
}

export interface ResolvedScale {
  id: string;
  value: string;
  label: string;
  isVisible: boolean;
  order: number;
}

export interface ResolveContext {
  sessionId: string;
  tenantId: string;
  surveyId: string;
  pageId: string;
  answers: Map<string, any>; // questionId -> answer
  loopContext?: Map<string, any>; // loop variables
  renderState?: any; // cached render state
}

export async function resolvePage(
  prisma: PrismaClient,
  context: ResolveContext
): Promise<ResolvedPage> {
  const { sessionId, tenantId, surveyId, pageId, answers, loopContext, renderState } = context;
  
  // console.log('🔍 Resolving page:', { pageId, answersSize: answers.size, answers: Array.from(answers.entries()) });

  // Get page with all related data
  const page = await prisma.surveyPage.findFirst({
    where: { id: pageId, tenantId, surveyId },
    include: {
      visibleIf: true,
      questionGroups: {
        include: {
          visibleIf: true,
          questions: {
            include: {
              visibleIf: true,
              options: {
                include: { visibleIf: true },
                orderBy: { index: 'asc' }
              },
              items: { 
                include: { visibleIf: true },
                orderBy: { index: 'asc' } 
              },
              scales: { 
                include: { visibleIf: true },
                orderBy: { index: 'asc' } 
              },
              carryForwardFilter: true
            },
            orderBy: { index: 'asc' }
          }
        },
        orderBy: { index: 'asc' }
      },
      questions: {
        where: { groupId: null }, // questions not in groups
        include: {
          visibleIf: true,
          options: {
            include: { visibleIf: true },
            orderBy: { index: 'asc' }
          },
          items: { 
            include: { visibleIf: true },
            orderBy: { index: 'asc' } 
          },
          scales: { 
            include: { visibleIf: true },
            orderBy: { index: 'asc' } 
          },
          carryForwardFilter: true
        },
        orderBy: { index: 'asc' }
      }
    }
  });

  if (!page) {
    throw new Error(`Page ${pageId} not found`);
  }

  // Create question ID mapping (variableName -> actual question ID) for the ENTIRE survey
  const questionIdMap = new Map<string, string>();
  
  // Get ALL questions from the entire survey, not just current page
  const allQuestions = await prisma.question.findMany({
    where: { 
      surveyId,
      tenantId 
    },
    select: {
      id: true,
      variableName: true
    }
  });
  
  // Build the mapping
  for (const question of allQuestions) {
    questionIdMap.set(question.variableName, question.id);
  }
  
  // console.log('🔍 Global Question ID mapping created:', Object.fromEntries(questionIdMap));

  // Check page visibility
  const isPageVisible = page.visibleIf 
    ? await evaluateExpression(page.visibleIf.dsl, answers, loopContext, undefined, questionIdMap)
    : true;

  if (!isPageVisible) {
    return {
      pageId,
      title: page.titleTemplate || '',
      description: page.descriptionTemplate || undefined,
      groups: [],
      isVisible: false
    };
  }

  // Resolve groups
  const resolvedGroups: ResolvedGroup[] = [];
  
  // Process question groups
  for (const group of page.questionGroups) {
    const isGroupVisible = group.visibleIf
      ? await evaluateExpression(group.visibleIf.dsl, answers, loopContext, undefined, questionIdMap)
      : true;

    if (!isGroupVisible) continue;

    const resolvedQuestions = await resolveQuestions(
      prisma,
      group.questions,
      answers,
      loopContext,
      sessionId,
      pageId,
      group.id,
      group.innerOrderMode,
      questionIdMap
    );

    resolvedGroups.push({
      id: group.id,
      title: group.titleTemplate ? processPipeExpressions(group.titleTemplate, answers, loopContext, questionIdMap) : undefined,
      description: group.descriptionTemplate ? processPipeExpressions(group.descriptionTemplate, answers, loopContext, questionIdMap) : undefined,
      questions: resolvedQuestions,
      isVisible: true,
      order: group.index
    });
  }

  // Process standalone questions (not in groups)
  if (page.questions.length > 0) {
    const resolvedQuestions = await resolveQuestions(
      prisma,
      page.questions,
      answers,
      loopContext,
      sessionId,
      pageId,
      null,
      page.questionOrderMode,
      questionIdMap
    );

    resolvedGroups.push({
      id: 'standalone',
      title: undefined,
      description: undefined,
      questions: resolvedQuestions,
      isVisible: true,
      order: 999 // standalone questions come last
    });
  }

  // Apply group ordering
  const orderedGroups = applyGroupOrdering(resolvedGroups, page.groupOrderMode, sessionId, pageId);

  return {
    pageId,
    title: processPipeExpressions(page.titleTemplate || '', answers, loopContext, questionIdMap),
    description: page.descriptionTemplate ? processPipeExpressions(page.descriptionTemplate, answers, loopContext, questionIdMap) : undefined,
    groups: orderedGroups,
    isVisible: true
  };
}

async function resolveQuestions(
  prisma: PrismaClient,
  questions: any[],
  answers: Map<string, any>,
  loopContext: Map<string, any> | undefined,
  sessionId: string,
  pageId: string,
  groupId: string | null,
  orderMode: string,
  questionIdMap: Map<string, string>
): Promise<ResolvedQuestion[]> {
  const resolvedQuestions: ResolvedQuestion[] = [];

  for (const question of questions) {
    const isQuestionVisible = question.visibleIf
      ? await evaluateExpression(question.visibleIf.dsl, answers, loopContext, undefined, questionIdMap)
      : true;

    if (!isQuestionVisible) continue;

    // Handle carry-forward options
    let options = question.options || [];
    if (question.optionsSource === 'CARRY_FORWARD' && question.carryForwardQuestionId) {
      const carryForwardOptions = await resolveCarryForwardOptions(
        prisma,
        question.carryForwardQuestionId,
        question.carryForwardFilter,
        answers,
        loopContext,
        questionIdMap
      );
      
      // Merge carry forward options with existing options
      // Remove duplicates based on option value
      const existingValues = new Set(options.map((opt: any) => opt.value));
      const newCarryForwardOptions = carryForwardOptions.filter((opt: any) => !existingValues.has(opt.value));
      
      options = [...options, ...newCarryForwardOptions];
      // console.log('🔍 Merged options:', { 
      //   original: options.length - newCarryForwardOptions.length, 
      //   carryForward: newCarryForwardOptions.length, 
      //   total: options.length 
      // });
    }

    // Resolve options
    const resolvedOptions = await resolveOptions(
      options,
      answers,
      loopContext,
      sessionId,
      pageId,
      groupId,
      question.id,
      question.optionOrderMode,
      questionIdMap
    );

    // Resolve items and scales for matrix questions with conditional logic
    const resolvedItems = await resolveMatrixItems(
      question.items || [],
      answers,
      loopContext,
      questionIdMap
    );

    const resolvedScales = await resolveMatrixScales(
      question.scales || [],
      answers,
      loopContext,
      questionIdMap
    );

    resolvedQuestions.push({
      id: question.id,
      variableName: question.variableName,
      type: question.type,
      title: processPipeExpressions(question.titleTemplate, answers, loopContext, questionIdMap),
      helpText: question.helpTextTemplate ? processPipeExpressions(question.helpTextTemplate, answers, loopContext, questionIdMap) : undefined,
      required: question.required,
      options: resolvedOptions,
      items: resolvedItems,
      scales: resolvedScales,
      validation: question.validation,
      isVisible: true,
      order: question.index,
      // Type-specific config
      minValue: question.minValue ? Number(question.minValue) : undefined,
      maxValue: question.maxValue ? Number(question.maxValue) : undefined,
      stepValue: question.stepValue ? Number(question.stepValue) : undefined,
      defaultValue: question.defaultValue ? Number(question.defaultValue) : undefined,
      scaleMinLabel: question.scaleMinLabel,
      scaleMaxLabel: question.scaleMaxLabel,
      scaleSteps: question.scaleSteps,
      maxSelections: question.maxSelections,
      allowOther: question.allowOther,
      otherLabel: question.otherLabel,
      allowedFileTypes: question.allowedFileTypes,
      maxFileSize: question.maxFileSize,
      maxFiles: question.maxFiles,
      dateFormat: question.dateFormat,
      timeFormat: question.timeFormat,
      minDate: question.minDate,
      maxDate: question.maxDate,
      phoneFormat: question.phoneFormat,
      countryCode: question.countryCode,
      urlProtocol: question.urlProtocol,
      paymentAmount: question.paymentAmount ? Number(question.paymentAmount) : undefined,
      currency: question.currency,
      paymentMethods: question.paymentMethods,
      imageLayout: question.imageLayout,
      imageSize: question.imageSize,
      matrixType: question.matrixType,
      showHeaders: question.showHeaders,
      randomizeRows: question.randomizeRows,
      randomizeColumns: question.randomizeColumns,
      totalPoints: question.totalPoints,
      allowZero: question.allowZero,
      signatureWidth: question.signatureWidth,
      signatureHeight: question.signatureHeight,
      signatureColor: question.signatureColor,
      consentText: question.consentText,
      requireSignature: question.requireSignature,
      collectName: question.collectName,
      collectEmail: question.collectEmail,
      collectPhone: question.collectPhone,
      collectCompany: question.collectCompany,
      collectAddress: question.collectAddress,
      showIpsosBranding: question.showIpsosBranding,
      groupSize: question.groupSize,
      groupLabel: question.groupLabel
    });
  }

  // Apply question ordering
  return applyQuestionOrdering(resolvedQuestions, orderMode, sessionId, pageId, groupId);
}

async function resolveOptions(
  options: any[],
  answers: Map<string, any>,
  loopContext: Map<string, any> | undefined,
  sessionId: string,
  pageId: string,
  groupId: string | null,
  questionId: string,
  orderMode: string,
  questionIdMap: Map<string, string>
): Promise<ResolvedOption[]> {
  const resolvedOptions: ResolvedOption[] = [];

  for (const option of options) {
    const isOptionVisible = option.visibleIf
      ? await evaluateExpression(option.visibleIf.dsl, answers, loopContext, undefined, questionIdMap)
      : true;


    if (!isOptionVisible) continue;

    resolvedOptions.push({
      id: option.id,
      value: option.value,
      label: processPipeExpressions(option.labelTemplate, answers, loopContext, questionIdMap),
      exclusive: option.exclusive,
      groupKey: option.groupKey,
      weight: option.weight,
      imageUrl: option.imageUrl,
      imageAlt: option.imageAlt,
      imageWidth: option.imageWidth,
      imageHeight: option.imageHeight,
      isVisible: true,
      order: option.index
    });
  }

  // Apply option ordering
  return applyOptionOrdering(resolvedOptions, orderMode, sessionId, pageId, groupId, questionId);
}

async function resolveCarryForwardOptions(
  prisma: PrismaClient,
  sourceQuestionId: string,
  filterExpression: any,
  answers: Map<string, any>,
  loopContext: Map<string, any> | undefined,
  questionIdMap: Map<string, string>
): Promise<any[]> {
  // console.log('🔍 Resolving carry forward options for source question:', sourceQuestionId);
  
  // Get the user's answer for the source question
  const sourceAnswer = answers.get(sourceQuestionId);
  // console.log('🔍 Source answer found:', sourceAnswer);
  
  if (!sourceAnswer || !sourceAnswer.choices || sourceAnswer.choices.length === 0) {
    // console.log('❌ No answer or choices found for source question');
    return [];
  }

  const selectedChoices = sourceAnswer.choices;
  // console.log('🔍 Selected choices:', selectedChoices);

  // Get the source question's options
  const sourceQuestion = await prisma.question.findUnique({
    where: { id: sourceQuestionId },
    include: { options: true }
  });

  if (!sourceQuestion) {
    // console.log('❌ Source question not found');
    return [];
  }

  // Filter options to only include the ones that were selected
  let options = sourceQuestion.options.filter(option => 
    selectedChoices.includes(option.value)
  );
  
  // console.log('🔍 Filtered options based on selected choices:', options.map(o => ({ value: o.value, label: o.labelTemplate })));

  // Apply additional filter expression if specified
  if (filterExpression) {
    // console.log('🔍 Applying additional filter expression');
    const filteredOptions = [];
    for (const option of options) {
      const passesFilter = await evaluateExpression(
        filterExpression.dsl,
        answers,
        loopContext,
        { option },
        questionIdMap
      );
      if (passesFilter) {
        filteredOptions.push(option);
      }
    }
    options = filteredOptions;
    // console.log('🔍 Options after filter expression:', options.map(o => ({ value: o.value, label: o.labelTemplate })));
  }

  // console.log('✅ Final carry forward options:', options.length);
  return options;
}

function applyGroupOrdering(
  groups: ResolvedGroup[],
  orderMode: string,
  sessionId: string,
  pageId: string
): ResolvedGroup[] {
  if (orderMode === 'SEQUENTIAL') {
    return groups.sort((a, b) => a.order - b.order);
  }

  if (orderMode === 'RANDOM') {
    const random = getDeterministicRandom(sessionId, pageId, 'groups');
    return groups.sort(() => random() - 0.5);
  }

  if (orderMode === 'GROUP_RANDOM') {
    // Keep groups together, shuffle groups
    const random = getDeterministicRandom(sessionId, pageId, 'groups');
    return groups.sort(() => random() - 0.5);
  }

  return groups;
}

function applyQuestionOrdering(
  questions: ResolvedQuestion[],
  orderMode: string,
  sessionId: string,
  pageId: string,
  groupId: string | null
): ResolvedQuestion[] {
  if (orderMode === 'SEQUENTIAL') {
    return questions.sort((a, b) => a.order - b.order);
  }

  if (orderMode === 'RANDOM') {
    const random = getDeterministicRandom(sessionId, pageId, groupId || 'standalone', 'questions');
    return questions.sort(() => random() - 0.5);
  }

  if (orderMode === 'WEIGHTED') {
    // Sort by weight (higher weight = earlier) - questions don't have weight, so just return as-is
    return questions;
  }

  return questions;
}

function applyOptionOrdering(
  options: ResolvedOption[],
  orderMode: string,
  sessionId: string,
  pageId: string,
  groupId: string | null,
  questionId: string
): ResolvedOption[] {
  if (orderMode === 'SEQUENTIAL') {
    return options.sort((a, b) => a.order - b.order);
  }

  if (orderMode === 'RANDOM') {
    const random = getDeterministicRandom(sessionId, pageId, groupId || 'standalone', questionId, 'options');
    return options.sort(() => random() - 0.5);
  }

  if (orderMode === 'GROUP_RANDOM') {
    // Group by groupKey, shuffle within groups, then shuffle groups
    const groups = new Map<string, ResolvedOption[]>();
    
    for (const option of options) {
      const key = option.groupKey || 'default';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(option);
    }

    const random = getDeterministicRandom(sessionId, pageId, groupId || 'standalone', questionId, 'options');
    
    // Shuffle within each group
    for (const group of groups.values()) {
      group.sort(() => random() - 0.5);
    }

    // Shuffle group order
    const groupKeys = Array.from(groups.keys()).sort(() => random() - 0.5);
    
    const result: ResolvedOption[] = [];
    for (const key of groupKeys) {
      result.push(...groups.get(key)!);
    }
    
    return result;
  }

  if (orderMode === 'WEIGHTED') {
    // Sort by weight (higher weight = earlier)
    return options.sort((a, b) => (b.weight || 0) - (a.weight || 0));
  }

  return options;
}

/**
 * Resolve matrix items with conditional logic
 */
async function resolveMatrixItems(
  items: any[],
  answers: Map<string, any>,
  loopContext: Map<string, any> | undefined,
  questionIdMap: Map<string, string>
): Promise<ResolvedItem[]> {
  const resolvedItems: ResolvedItem[] = [];

  console.log('🔍 [resolveMatrixItems] Processing items:', items.length);
  console.log('🔍 [resolveMatrixItems] Current answers:', Object.fromEntries(answers));

  for (const item of items) {
    console.log(`🔍 [resolveMatrixItems] Processing item: ${item.label} (${item.id})`);
    console.log(`🔍 [resolveMatrixItems] Item has visibleIf:`, !!item.visibleIf);
    
    if (item.visibleIf) {
      console.log(`🔍 [resolveMatrixItems] Item visibleIf DSL:`, item.visibleIf.dsl);
    }

    const isItemVisible = item.visibleIf
      ? await evaluateExpression(item.visibleIf.dsl, answers, loopContext, undefined, questionIdMap)
      : true;

    console.log(`🔍 [resolveMatrixItems] Item ${item.label} visibility result:`, isItemVisible);

    if (!isItemVisible) {
      console.log(`🔍 [resolveMatrixItems] Skipping item ${item.label} - not visible`);
      continue;
    }

    resolvedItems.push({
      id: item.id,
      value: item.value,
      label: processPipeExpressions(item.label, answers, loopContext, questionIdMap),
      isVisible: true,
      order: item.index
    });
  }

  console.log(`🔍 [resolveMatrixItems] Final resolved items:`, resolvedItems.length);
  return resolvedItems;
}

/**
 * Resolve matrix scales with conditional logic
 */
async function resolveMatrixScales(
  scales: any[],
  answers: Map<string, any>,
  loopContext: Map<string, any> | undefined,
  questionIdMap: Map<string, string>
): Promise<ResolvedScale[]> {
  const resolvedScales: ResolvedScale[] = [];

  for (const scale of scales) {
    const isScaleVisible = scale.visibleIf
      ? await evaluateExpression(scale.visibleIf.dsl, answers, loopContext, undefined, questionIdMap)
      : true;

    if (!isScaleVisible) continue;

    resolvedScales.push({
      id: scale.id,
      value: scale.value,
      label: processPipeExpressions(scale.label, answers, loopContext, questionIdMap),
      isVisible: true,
      order: scale.index
    });
  }

  return resolvedScales;
}
