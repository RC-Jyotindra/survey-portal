/**
 * Runtime Controller
 * 
 * Handles the main survey runtime endpoints:
 * - Start session
 * - Get page layout
 * - Submit answers
 * - Complete session
 * - Terminate session
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { checkAdmission, createSessionMetadata, consumeToken, checkSessionContinuation } from '../collectors/admission';
import { resolvePage, ResolveContext } from '../runtime/resolvePage';
import { validateAnswers, AnswerData } from '../runtime/validate';
import { routeNext, getFirstPage, RoutingContext } from '../runtime/router';
import { checkQuestionTermination } from '../runtime/router';
import { checkQuota, reserveQuota, finalizeQuota, releaseQuota } from '../runtime/quota';
import { getEventBusService } from '../lib/event-bus';
import { createRuntimeSettingsEngine, RuntimeSettingsContext, SettingsPhase } from '../runtime/settings-engine';
import { sendCompletionNotificationForSession } from '../lib/completion-notifications';

const prisma = new PrismaClient();
const settingsEngine = createRuntimeSettingsEngine(prisma);

/**
 * Start a new survey session
 */
export async function startSession(req: Request, res: Response) {
  try {
    const { slug } = req.query;
    const { t: token } = req.query; // for single-use collectors
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress || '';
    const referrer = req.get('Referer') || '';
    const utmParams = req.query as Record<string, string>;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Survey slug is required' });
    }

    // Check admission
    const admissionResult = await checkAdmission(prisma, {
      slug,
      token: token as string,
      userAgent,
      ip,
      referrer,
      utmParams
    });

    if (!admissionResult.canProceed) {
      return res.status(403).json({
        error: admissionResult.message,
        reason: admissionResult.reason
      });
    }

    const { collector, closingSoon, existingSession } = admissionResult;

    // If there's an existing IN_PROGRESS session, return it for resumption
    if (existingSession) {
      return res.json({
        sessionId: existingSession.id,
        firstPageId: existingSession.currentPageId,
        isResume: true,
        message: 'Resuming existing session'
      });
    }

    // Get survey settings for runtime engine
    const survey = await prisma.survey.findUnique({
      where: { id: collector!.surveyId },
      select: { settings: true }
    });

    // Apply ADMISSION phase settings
    const settingsContext: RuntimeSettingsContext = {
      sessionId: '', // Will be set after session creation
      surveyId: collector!.surveyId,
      collectorId: collector!.id,
      tenantId: collector!.tenantId,
      currentPhase: SettingsPhase.ADMISSION,
      userContext: {
        ip,
        userAgent,
        referrer,
        deviceId: '', // Will be set from metadata
        geoData: undefined, // Will be set from metadata
        vpnStatus: undefined // Will be set from metadata
      },
      surveySettings: survey?.settings || {},
      answers: new Map(),
      sessionMetadata: undefined
    };

    const admissionSettingsResult = await settingsEngine.applySettings(settingsContext);
    
    if (!admissionSettingsResult.canProceed) {
      return res.status(403).json({
        error: admissionSettingsResult.message || 'Access denied',
        reason: admissionSettingsResult.reason
      });
    }

    // Create session metadata (now async with geo lookup)
    const metadata = await createSessionMetadata(
      collector!.id,
      undefined, // inviteId will be set if token was used
      userAgent,
      ip,
      referrer,
      utmParams
    );

    // Get first page before creating session
    const firstPageId = await getFirstPage(
      prisma,
      collector!.surveyId,
      collector!.tenantId,
      new Map(), // no answers yet
      undefined, // no loop context yet
      undefined // no questionIdMap needed for first page
    );

    if (!firstPageId) {
      return res.status(500).json({ error: 'No accessible pages found' });
    }

    // Create session with initial progress tracking
    const session = await prisma.surveySession.create({
      data: {
        tenantId: collector!.tenantId,
        surveyId: collector!.surveyId,
        collectorId: collector!.id,
        status: 'IN_PROGRESS',
        meta: metadata as any, // Type assertion for Prisma JsonValue
        renderState: {},
        currentPageId: firstPageId, // Set initial page
        lastActivityAt: new Date(), // Set initial activity time
        progressData: {} // Initialize empty progress data
      }
    });

    // Consume token if it was a single-use collector
    if (collector!.type === 'SINGLE_USE' && token) {
      await consumeToken(prisma, collector!.id, token as string);
    }

    // Publish session started event
    try {
      const eventBus = getEventBusService(prisma);
      await eventBus.publishSessionStarted(session.id, collector!.tenantId, collector!.surveyId);
      console.log('🚀 [SESSION_STARTED]', { sessionId: session.id, surveyId: collector!.surveyId, tenantId: collector!.tenantId });
    } catch (error) {
      console.error('❌ [EVENT_ERROR] Failed to publish session started event:', error);
      // Don't fail the request if event publishing fails
    }

    res.json({
      sessionId: session.id,
      firstPageId,
      closingSoon: closingSoon || false
    });

  } catch (error) {
    console.error('❌ [SESSION_START_ERROR]', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
}

/**
 * Get page layout for rendering
 */
export async function getPageLayout(req: Request, res: Response) {
  try {
    const { sessionId, pageId } = req.params;

    // Get session
    const session = await prisma.surveySession.findUnique({
      where: { id: sessionId },
      include: {
        collector: true,
        answers: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Build answers map
    const answers = new Map<string, any>();
    for (const answer of session.answers) {
      answers.set(answer.questionId, answer);
    }
    
    console.log('📊 [SESSION_ANSWERS]', { sessionId, answersSize: answers.size });

    // Build loop context from render state
    const renderState = session.renderState as any;
    const loopContext = renderState?.loopState 
      ? new Map(Object.entries(renderState.loopState))
      : undefined;

    // Get survey settings for runtime engine
    const survey = await prisma.survey.findUnique({
      where: { id: session.surveyId },
      select: { settings: true }
    });

    // Apply NAVIGATION phase settings
    const navigationSettingsContext: RuntimeSettingsContext = {
      sessionId: sessionId as string,
      surveyId: session.surveyId,
      collectorId: session.collectorId as string,
      tenantId: session.tenantId,
      currentPhase: SettingsPhase.NAVIGATION,
      currentPageId: pageId!,
      userContext: {
        ip: (session.meta as any)?.ip || '',
        userAgent: (session.meta as any)?.userAgent || '',
        referrer: (session.meta as any)?.referrer,
        deviceId: (session.meta as any)?.deviceId || '',
        geoData: (session.meta as any)?.geoData,
        vpnStatus: (session.meta as any)?.geoData?.riskScore
      },
      surveySettings: survey?.settings || {},
      answers,
      sessionMetadata: session.meta,
      loopContext
    };

    const navigationSettingsResult = await settingsEngine.applySettings(navigationSettingsContext);

    // Resolve page
    const context: ResolveContext = {
      sessionId: sessionId as string,
      tenantId: session.tenantId,
      surveyId: session.surveyId,
      pageId: pageId!,
      answers,
      loopContext,
      renderState: renderState
    };

    const resolvedPage = await resolvePage(prisma, context);

    // Debug logging for contact form questions
    if (resolvedPage && resolvedPage.groups) {
      const allQuestions = resolvedPage.groups.flatMap(group => group.questions || []);
      const contactFormQuestions = allQuestions.filter((q: any) => q.type === 'CONTACT_FORM');
      if (contactFormQuestions.length > 0) {
        console.log('🔍 Contact Form Questions Debug:', contactFormQuestions.map((q: any) => ({
          id: q.id,
          type: q.type,
          showIpsosBranding: q.showIpsosBranding,
          collectName: q.collectName,
          collectEmail: q.collectEmail,
          collectPhone: q.collectPhone
        })));
      }
    }

    // Update render state with resolved order
    await prisma.surveySession.update({
      where: { id: sessionId },
      data: {
        renderState: {
          ...(renderState && typeof renderState === 'object' ? renderState : {}),
          [pageId as string]: resolvedPage
        }
      }
    });

    // Include UI settings from navigation settings result
    const response = {
      ...resolvedPage,
      uiSettings: navigationSettingsResult.uiSettings || {}
    };

    res.json(response);

  } catch (error) {
    console.error('❌ [PAGE_LAYOUT_ERROR]', error);
    res.status(500).json({ error: 'Failed to get page layout' });
  }
}

/**
 * Submit answers and get next page
 */
export async function submitAnswers(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const { pageId, answers: submittedAnswers } = req.body;

    if (!pageId || !submittedAnswers) {
      return res.status(400).json({ error: 'Page ID and answers are required' });
    }

    // Get session
    const session = await prisma.surveySession.findUnique({
      where: { id: sessionId },
      include: {
        collector: true,
        answers: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Get questions for validation
    const questions = await prisma.question.findMany({
      where: {
        pageId,
        tenantId: session.tenantId,
        surveyId: session.surveyId
      }
    });

    // Validate answers
    const answerData: AnswerData[] = submittedAnswers.map((answer: any) => ({
      questionId: answer.questionId,
      choices: answer.choices,
      textValue: answer.textValue,
      numericValue: answer.numericValue,
      decimalValue: answer.decimalValue,
      booleanValue: answer.booleanValue,
      emailValue: answer.emailValue,
      phoneValue: answer.phoneValue,
      urlValue: answer.urlValue,
      dateValue: answer.dateValue ? new Date(answer.dateValue) : undefined,
      timeValue: answer.timeValue ? new Date(answer.timeValue) : undefined,
      fileUrls: answer.fileUrls,
      signatureUrl: answer.signatureUrl,
      paymentId: answer.paymentId,
      paymentStatus: answer.paymentStatus,
      jsonValue: answer.jsonValue || answer.matrixValue // Map matrixValue to jsonValue
    }));

    const validationResult = validateAnswers(answerData, questions as any);

    // Get survey settings for runtime engine
    const survey = await prisma.survey.findUnique({
      where: { id: session.surveyId },
      select: { settings: true }
    });

    // Apply VALIDATION phase settings
    const validationSettingsContext: RuntimeSettingsContext = {
      sessionId: sessionId as string,
      surveyId: session.surveyId,
      collectorId: session.collectorId as string,
      tenantId: session.tenantId,
      currentPhase: SettingsPhase.VALIDATION,
      currentPageId: pageId,
      userContext: {
        ip: (session.meta as any)?.ip || '',
        userAgent: (session.meta as any)?.userAgent || '',
        referrer: (session.meta as any)?.referrer,
        deviceId: (session.meta as any)?.deviceId || '',
        geoData: (session.meta as any)?.geoData,
        vpnStatus: (session.meta as any)?.geoData?.riskScore
      },
      surveySettings: survey?.settings || {},
      answers: new Map(answerData.map(a => [a.questionId, a])),
      sessionMetadata: session.meta
    };

    const validationSettingsResult = await settingsEngine.applySettings(validationSettingsContext);

    if (!validationResult.isValid) {
      // Use custom error message if available
      const errorMessage = validationSettingsResult.validationSettings?.customErrorMessage || 'Validation failed';
      
      return res.status(400).json({
        error: errorMessage,
        violations: validationResult.violations
      });
    }

    // Save answers
    await prisma.$transaction(async (tx) => {
      // Delete existing answers for this page
      await tx.answer.deleteMany({
        where: {
          sessionId,
          question: {
            pageId
          }
        }
      });

      // Insert new answers
      for (const answer of answerData) {
        await tx.answer.create({
          data: {
            tenantId: session.tenantId,
            surveyId: session.surveyId,
            sessionId: sessionId as string,
            questionId: answer.questionId,
            choices: answer.choices || [],
            textValue: answer.textValue,
            numericValue: answer.numericValue,
            decimalValue: answer.decimalValue,
            booleanValue: answer.booleanValue,
            emailValue: answer.emailValue,
            phoneValue: answer.phoneValue,
            urlValue: answer.urlValue,
            dateValue: answer.dateValue,
            timeValue: answer.timeValue,
            fileUrls: answer.fileUrls || [],
            signatureUrl: answer.signatureUrl,
            paymentId: answer.paymentId,
            paymentStatus: answer.paymentStatus,
            jsonValue: answer.jsonValue
          }
        });
      }
    });

    // Check quota if this is a defining answer
    const quotaResult = await checkQuota(
      prisma,
      sessionId!,
      session.surveyId,
      session.tenantId,
      new Map(answerData.map(a => [a.questionId, a]))
    );

    if (!quotaResult.canProceed) {
      // Release any existing reservations and terminate
      await releaseQuota(prisma, sessionId!);
      await prisma.surveySession.update({
        where: { id: sessionId! },
        data: { status: 'TERMINATED' }
      });

      return res.status(403).json({
        error: quotaResult.message,
        reason: quotaResult.reason
      });
    }

    // Try to reserve quota
    const reservationResult = await reserveQuota(
      prisma,
      sessionId!,
      session.surveyId,
      session.tenantId,
      new Map(answerData.map(a => [a.questionId, a]))
    );

    if (!reservationResult.success) {
      // Release any existing reservations and terminate
      await releaseQuota(prisma, sessionId!);
      await prisma.surveySession.update({
        where: { id: sessionId! },
        data: { status: 'TERMINATED' }
      });

      // Publish session terminated event
      try {
        const eventBus = getEventBusService(prisma);
        await eventBus.publishSessionTerminated(sessionId!, session.tenantId, session.surveyId, 'OVERQUOTA');
        console.log('🛑 [SESSION_TERMINATED]', { sessionId, reason: 'OVERQUOTA', surveyId: session.surveyId, tenantId: session.tenantId });
      } catch (error) {
        console.error('❌ [EVENT_ERROR] Failed to publish session terminated event:', error);
      }

      return res.status(403).json({
        error: 'Survey quota has been reached',
        reason: 'OVERQUOTA'
      });
    }

    // Get updated answers for routing
    const allAnswers = await prisma.answer.findMany({
      where: { sessionId }
    });

    const answersMap = new Map<string, any>();
    for (const answer of allAnswers) {
      answersMap.set(answer.questionId, answer);
    }
    console.log(`[RUNTIME] Constructed answersMap with ${answersMap.size} answers:`, Array.from(answersMap.entries()).map(([id, answer]) => ({ questionId: id, hasChoices: !!answer.choices, choices: answer.choices })));

    // Build loop context from render state
    const renderState = session.renderState as any;

    // Create question ID mapping for the entire survey
    const allQuestions = await prisma.question.findMany({
      where: { 
        surveyId: session.surveyId,
        tenantId: session.tenantId 
      },
      select: {
        id: true,
        variableName: true
      }
    });
    
    const questionIdMap = new Map<string, string>();
    for (const question of allQuestions) {
      questionIdMap.set(question.variableName, question.id);
    }
    console.log(`[RUNTIME] Constructed questionIdMap with ${questionIdMap.size} mappings:`, Array.from(questionIdMap.entries()));

    // Check termination logic for all answered questions first
    for (const answer of answerData) {
      console.log(`[RUNTIME] Checking termination logic for questionId: ${answer.questionId}`);
      const terminationResult = await checkQuestionTermination(
        prisma,
        answer.questionId,
        answersMap,
        renderState?.loopState ? new Map(Object.entries(renderState.loopState)) : undefined,
        questionIdMap
      );
      
      if (terminationResult.isTerminated) {
        console.log(`[RUNTIME] Survey terminated due to question ${answer.questionId}: ${terminationResult.terminationReason}`);
        // Release quota and mark session as terminated
        await releaseQuota(prisma, sessionId!);
        await prisma.surveySession.update({
          where: { id: sessionId! },
          data: {
            status: 'TERMINATED',
            finalizedAt: new Date(),
            meta: {
              ...(session.meta && typeof session.meta === 'object' ? session.meta as any : {}),
              terminationReason: terminationResult.terminationReason || 'Survey terminated based on answer'
            }
          }
        });

        // Publish session terminated event
        try {
          const eventBus = getEventBusService(prisma);
          await eventBus.publishSessionTerminated(sessionId!, session.tenantId, session.surveyId, terminationResult.terminationReason);
          console.log('🛑 [SESSION_TERMINATED]', { sessionId, reason: terminationResult.terminationReason, surveyId: session.surveyId, tenantId: session.tenantId });
        } catch (error) {
          console.error('❌ [EVENT_ERROR] Failed to publish session terminated event:', error);
        }

        return res.json({
          terminated: true,
          reason: terminationResult.terminationReason || 'Survey terminated based on answer'
        });
      }
    }

    // Route to next page
    const routingContext: RoutingContext = {
      sessionId: sessionId as string,
      tenantId: session.tenantId,
      surveyId: session.surveyId,
      currentPageId: pageId,
      currentQuestionId: answerData.length > 0 ? answerData[0]?.questionId : undefined, // Add current question ID for jump logic
      answers: answersMap,
      loopContext: renderState?.loopState 
        ? new Map(Object.entries(renderState.loopState))
        : undefined,
      questionIdMap
    };

    const routingResult = await routeNext(prisma, routingContext);

    // Publish answer submission and quota events
    try {
      const eventBus = getEventBusService(prisma);
      
      if (reservationResult.success && reservationResult.bucketId) {
        await eventBus.publishAnswerSubmissionEvents(
          sessionId!,
          session.tenantId,
          session.surveyId,
          pageId,
          answerData,
          [{ type: 'reserved', bucketId: reservationResult.bucketId }]
        );
        console.log('💾 [ANSWERS_UPSERTED]', { sessionId, pageId, answerCount: answerData.length, quotaReserved: true, bucketId: reservationResult.bucketId });
      } else {
        await eventBus.publishAnswerUpserted(
          sessionId!,
          session.tenantId,
          session.surveyId,
          pageId,
          answerData
        );
        console.log('💾 [ANSWERS_UPSERTED]', { sessionId, pageId, answerCount: answerData.length, quotaReserved: false });
      }
    } catch (error) {
      console.error('❌ [EVENT_ERROR] Failed to publish answer submission events:', error);
      // Don't fail the request if event publishing fails
    }

    if (routingResult.isTerminated) {
      // Release quota and mark session as terminated
      await releaseQuota(prisma, sessionId!);
      await prisma.surveySession.update({
        where: { id: sessionId! },
        data: {
          status: 'TERMINATED',
          finalizedAt: new Date(),
          meta: {
            ...(session.meta && typeof session.meta === 'object' ? session.meta as any : {}),
            terminationReason: routingResult.terminationReason || 'Survey terminated based on answer'
          }
        }
      });

      // Publish session terminated event
      try {
        const eventBus = getEventBusService(prisma);
        await eventBus.publishSessionTerminated(sessionId!, session.tenantId, session.surveyId, routingResult.terminationReason);
        console.log('🛑 [SESSION_TERMINATED]', { sessionId, reason: routingResult.terminationReason, surveyId: session.surveyId, tenantId: session.tenantId });
      } catch (error) {
        console.error('❌ [EVENT_ERROR] Failed to publish session terminated event:', error);
      }

      return res.json({ 
        terminated: true, 
        reason: routingResult.terminationReason || 'Survey terminated based on answer'
      });
    }

    if (routingResult.isComplete) {
      // Finalize quota and mark session as completed
      await finalizeQuota(prisma, sessionId!);
      await prisma.surveySession.update({
        where: { id: sessionId! },
        data: {
          status: 'COMPLETED',
          finalizedAt: new Date()
        }
      });

      // Send completion notification email
      try {
        await sendCompletionNotificationForSession(
          prisma,
          session.tenantId,
          session.surveyId,
          sessionId!
        );
      } catch (error) {
        // Don't fail the request if email sending fails
        console.error('❌ [EMAIL_ERROR] Failed to send completion notification:', error);
      }

      // Publish session completed event
      try {
        const eventBus = getEventBusService(prisma);
        await eventBus.publishSessionCompleted(sessionId!, session.tenantId, session.surveyId);
        console.log('✅ [SESSION_COMPLETED]', { sessionId, surveyId: session.surveyId, tenantId: session.tenantId });
      } catch (error) {
        console.error('❌ [EVENT_ERROR] Failed to publish session completed event:', error);
      }

      return res.json({ complete: true });
    }

    // Update session progress tracking
    await prisma.surveySession.update({
      where: { id: sessionId! },
      data: {
        currentPageId: routingResult.nextPageId || pageId, // Update to next page or keep current if no next page
        lastActivityAt: new Date(), // Update activity time
        progressData: {
          // Store current answers for potential resume
          currentAnswers: submittedAnswers,
          pageHistory: [...(session.progressData as any)?.pageHistory || [], pageId],
          lastSubmittedAt: new Date().toISOString()
        }
      }
    });

    res.json({
      next: {
        pageId: routingResult.nextPageId,
        questionId: routingResult.nextQuestionId
      }
    });

  } catch (error) {
    console.error('❌ [SUBMIT_ANSWERS_ERROR]', error);
    res.status(500).json({ error: 'Failed to submit answers' });
  }
}

/**
 * Complete a session
 */
export async function completeSession(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;

    // Get session
    const session = await prisma.surveySession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Get survey settings for runtime engine
    const survey = await prisma.survey.findUnique({
      where: { id: session.surveyId },
      select: { settings: true }
    });

    // Get session answers for context
    const answers = await prisma.answer.findMany({
      where: { sessionId: sessionId! }
    });
    const answersMap = new Map(answers.map(a => [a.questionId, a]));

    // Apply COMPLETION phase settings
    const completionSettingsContext: RuntimeSettingsContext = {
      sessionId: sessionId as string,
      surveyId: session.surveyId,
      collectorId: session.collectorId as string,
      tenantId: session.tenantId,
      currentPhase: SettingsPhase.COMPLETION,
      userContext: {
        ip: (session.meta as any)?.ip || '',
        userAgent: (session.meta as any)?.userAgent || '',
        referrer: (session.meta as any)?.referrer,
        deviceId: (session.meta as any)?.deviceId || '',
        geoData: (session.meta as any)?.geoData,
        vpnStatus: (session.meta as any)?.geoData?.riskScore
      },
      surveySettings: survey?.settings || {},
      answers: answersMap,
      sessionMetadata: session.meta
    };

    const completionSettingsResult = await settingsEngine.applySettings(completionSettingsContext);

    // Check if completion is blocked by settings
    if (!completionSettingsResult.canProceed) {
      return res.status(403).json({
        error: completionSettingsResult.message || 'Survey completion blocked',
        reason: completionSettingsResult.reason
      });
    }

    // Finalize quota
    await finalizeQuota(prisma, sessionId!);

    // Mark session as completed
    await prisma.surveySession.update({
      where: { id: sessionId! },
      data: {
        status: 'COMPLETED',
        finalizedAt: new Date()
      }
    });

    // Send completion notification email
    try {
      await sendCompletionNotificationForSession(
        prisma,
        session.tenantId,
        session.surveyId,
        sessionId!
      );
    } catch (error) {
      // Don't fail the request if email sending fails
      console.error('❌ [EMAIL_ERROR] Failed to send completion notification:', error);
    }

    // Return completion result with post-survey settings
    const response = {
      success: true,
      postSurveySettings: completionSettingsResult.postSurveySettings || {}
    };

    res.json(response);

  } catch (error) {
    console.error('❌ [COMPLETE_SESSION_ERROR]', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
}

/**
 * Terminate a session
 */
export async function terminateSession(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    // Get session
    const session = await prisma.surveySession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Release quota
    await releaseQuota(prisma, sessionId!);

    // Mark session as terminated
    await prisma.surveySession.update({
      where: { id: sessionId! },
      data: {
        status: 'TERMINATED',
        finalizedAt: new Date(),
        meta: {
          ...(session.meta && typeof session.meta === 'object' ? session.meta as any : {}),
          terminationReason: reason
        }
      }
    });

    console.log('🛑 [SESSION_TERMINATED]', { sessionId, reason, surveyId: session.surveyId, tenantId: session.tenantId });

    res.json({ success: true });

  } catch (error) {
    console.error('❌ [TERMINATE_SESSION_ERROR]', error);
    res.status(500).json({ error: 'Failed to terminate session' });
  }
}

/**
 * Resume a session from where user left off
 */
export async function resumeSession(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    console.log('🔄 [RESUME_SESSION] Starting resume for session:', sessionId);

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Get session with progress data
    const session = await prisma.surveySession.findUnique({
      where: { id: sessionId },
      include: {
        collector: {
          include: {
            survey: true
          }
        }
      }
    });

    if (!session) {
      console.log('❌ [RESUME_SESSION] Session not found:', sessionId);
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log('✅ [RESUME_SESSION] Session found:', { 
      id: session.id, 
      status: session.status, 
      currentPageId: session.currentPageId 
    });

    if (session.status !== 'IN_PROGRESS') {
      console.log('❌ [RESUME_SESSION] Session not active:', session.status);
      return res.status(400).json({ 
        error: 'Session is not active',
        status: session.status 
      });
    }

    // Check if session can be resumed (using existing admission logic)
    console.log('🔍 [RESUME_SESSION] Checking session continuation...');
    const admissionResult = await checkSessionContinuation(prisma, sessionId);
    if (!admissionResult.canProceed) {
      console.log('❌ [RESUME_SESSION] Session continuation failed:', admissionResult.reason);
      return res.status(403).json({
        error: admissionResult.message,
        reason: admissionResult.reason
      });
    }

    // Update last activity time
    console.log('⏰ [RESUME_SESSION] Updating last activity time...');
    await prisma.surveySession.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() }
    });

    // Get current page and progress data
    const currentPageId = session.currentPageId;
    const progressData = session.progressData as any || {};

    console.log('📄 [RESUME_SESSION] Current page:', currentPageId);
    console.log('📊 [RESUME_SESSION] Progress data:', progressData);

    if (!currentPageId) {
      console.log('❌ [RESUME_SESSION] No current page found');
      return res.status(500).json({ error: 'No current page found for session' });
    }

    // Get the current page layout
    console.log('🔧 [RESUME_SESSION] Resolving page layout...');
    const pageData = await resolvePage(prisma, {
      sessionId: sessionId as string,
      tenantId: session.tenantId,
      surveyId: session.surveyId,
      pageId: currentPageId,
      answers: new Map(), // We'll load answers separately
      loopContext: undefined
    });

    console.log('✅ [RESUME_SESSION] Page resolved successfully');

    res.json({
      sessionId: session.id,
      currentPageId,
      pageData,
      progressData: {
        pageHistory: progressData.pageHistory || [],
        lastSubmittedAt: progressData.lastSubmittedAt,
        currentAnswers: progressData.currentAnswers || []
      },
      canResume: true
    });

  } catch (error) {
    console.error('❌ [RESUME_SESSION_ERROR]', error);
    res.status(500).json({ error: 'Failed to resume session' });
  }
}

/**
 * Get session status
 */
export async function getSessionStatus(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;

    const session = await prisma.surveySession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        finalizedAt: true,
        surveyId: true,
        tenantId: true,
        collector: {
          select: {
            name: true,
            type: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get the first page ID for this survey
    const firstPage = await prisma.surveyPage.findFirst({
      where: {
        surveyId: session.surveyId,
        tenantId: session.tenantId
      },
      orderBy: { index: 'asc' },
      select: { id: true }
    });

    res.json({
      sessionId: session.id,
      status: session.status,
      startedAt: session.startedAt,
      finalizedAt: session.finalizedAt,
      firstPageId: firstPage?.id || null,
      collector: session.collector
    });

  } catch (error) {
    console.error('❌ [SESSION_STATUS_ERROR]', error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
}
