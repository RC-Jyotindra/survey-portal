import { Router } from "express";
import { prisma } from "@repo/database";
import { requireSurveyBuilder } from "../middleware/auth";
import { 
  validateRequest, 
  createAnswerSchema, 
  updateAnswerSchema 
} from "../lib/validation";
import { AnswerProcessor } from "../lib/answer-processor";
import { QuestionTypeHandler } from "../lib/question-type-handlers";

const router = Router();

/**
 * POST /surveys/:id/answers
 * Submit an answer for a question
 * Requires: SB access with VIEWER role (for taking surveys)
 */
router.post("/:id/answers", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;

    // Validate request body
    const validation = validateRequest(createAnswerSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;

    // Verify survey exists and belongs to tenant
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId }
    });

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    // Verify session exists and belongs to survey
    const session = await prisma.surveySession.findFirst({
      where: { id: data.sessionId, surveyId, tenantId }
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Verify question exists and belongs to survey
    const question = await prisma.question.findFirst({
      where: { id: data.questionId, surveyId, tenantId }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Get question configuration
    const questionConfig = {
      minValue: question.minValue,
      maxValue: question.maxValue,
      stepValue: question.stepValue,
      defaultValue: question.defaultValue,
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
      paymentAmount: question.paymentAmount,
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
      groupSize: question.groupSize,
      groupLabel: question.groupLabel,
      validation: question.validation
    };

    // Process the answer based on question type
    const answerProcessing = AnswerProcessor.processAnswer(question.type, data, questionConfig);
    if (!answerProcessing.success) {
      return res.status(400).json({ error: answerProcessing.error });
    }

    const processedAnswer = answerProcessing.processedAnswer!;

    // Check if answer already exists for this question in this session
    const existingAnswer = await prisma.answer.findFirst({
      where: { sessionId: data.sessionId, questionId: data.questionId }
    });

    let answer;
    if (existingAnswer) {
      // Update existing answer
      answer = await prisma.answer.update({
        where: { id: existingAnswer.id },
        data: {
          choices: processedAnswer.choices || [],
          textValue: processedAnswer.textValue,
          numericValue: processedAnswer.numericValue,
          decimalValue: processedAnswer.decimalValue,
          dateValue: processedAnswer.dateValue,
          timeValue: processedAnswer.timeValue,
          jsonValue: processedAnswer.jsonValue,
          booleanValue: processedAnswer.booleanValue,
          emailValue: processedAnswer.emailValue,
          phoneValue: processedAnswer.phoneValue,
          urlValue: processedAnswer.urlValue,
          fileUrls: processedAnswer.fileUrls || [],
          signatureUrl: processedAnswer.signatureUrl,
          paymentId: processedAnswer.paymentId,
          paymentStatus: processedAnswer.paymentStatus
        }
      });
    } else {
      // Create new answer
      answer = await prisma.answer.create({
        data: {
          tenantId,
          surveyId,
          sessionId: data.sessionId,
          questionId: data.questionId,
          choices: processedAnswer.choices || [],
          textValue: processedAnswer.textValue,
          numericValue: processedAnswer.numericValue,
          decimalValue: processedAnswer.decimalValue,
          dateValue: processedAnswer.dateValue,
          timeValue: processedAnswer.timeValue,
          jsonValue: processedAnswer.jsonValue,
          booleanValue: processedAnswer.booleanValue,
          emailValue: processedAnswer.emailValue,
          phoneValue: processedAnswer.phoneValue,
          urlValue: processedAnswer.urlValue,
          fileUrls: processedAnswer.fileUrls || [],
          signatureUrl: processedAnswer.signatureUrl,
          paymentId: processedAnswer.paymentId,
          paymentStatus: processedAnswer.paymentStatus
        }
      });
    }

    return res.status(201).json({ answer });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return res.status(500).json({ error: "Failed to submit answer" });
  }
});

/**
 * GET /surveys/:id/answers
 * Get all answers for a survey session
 * Requires: SB access with VIEWER role
 */
router.get("/:id/answers", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Verify survey exists and belongs to tenant
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId }
    });

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    // Verify session exists and belongs to survey
    const session = await prisma.surveySession.findFirst({
      where: { id: sessionId, surveyId, tenantId }
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const answers = await prisma.answer.findMany({
      where: { surveyId, sessionId, tenantId },
      include: {
        question: {
          select: {
            id: true,
            variableName: true,
            titleTemplate: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({ answers });
  } catch (error) {
    console.error("Error fetching answers:", error);
    return res.status(500).json({ error: "Failed to fetch answers" });
  }
});

/**
 * GET /surveys/:id/answers/export
 * Export all answers for a survey to CSV
 * Requires: SB access with VIEWER role
 */
router.get("/:id/answers/export", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;

    // Verify survey exists and belongs to tenant
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId }
    });

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    // Get all questions with their items and scales
    const questions = await prisma.question.findMany({
      where: { surveyId, tenantId },
      include: {
        items: { select: { id: true, label: true } },
        scales: { select: { id: true, label: true } }
      },
      orderBy: { index: 'asc' }
    });

    // Get all answers
    const answers = await prisma.answer.findMany({
      where: { surveyId, tenantId },
      include: {
        question: {
          select: {
            id: true,
            variableName: true,
            titleTemplate: true,
            type: true,
            items: { select: { id: true, label: true } },
            scales: { select: { id: true, label: true } }
          }
        },
        session: {
          select: { id: true, startedAt: true, finalizedAt: true }
        }
      },
      orderBy: [
        { sessionId: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Group answers by session
    const sessionAnswers = new Map<string, any[]>();
    answers.forEach(answer => {
      if (!sessionAnswers.has(answer.sessionId)) {
        sessionAnswers.set(answer.sessionId, []);
      }
      sessionAnswers.get(answer.sessionId)!.push(answer);
    });

    // Create CSV headers
    const headers = [
      'Session ID',
      'Started At',
      'Completed At',
      'Duration (minutes)',
      ...questions.map(q => {
        if (q.type === 'MATRIX_SINGLE' || q.type === 'MATRIX_MULTIPLE' || q.type === 'BIPOLAR_MATRIX') {
          // For matrix questions, create columns for each item-scale combination
          const matrixColumns: string[] = [];
          q.items?.forEach((item: any) => {
            q.scales?.forEach((scale: any) => {
              matrixColumns.push(`${q.variableName}_${item.label}_${scale.label}`);
            });
          });
          return matrixColumns;
        } else {
          return q.variableName;
        }
      }).flat()
    ];

    // Create CSV rows
    const rows: string[][] = [];
    sessionAnswers.forEach((sessionAnswersList, sessionId) => {
      const session = sessionAnswersList[0]?.session;
      const duration = session?.finalizedAt && session?.startedAt 
        ? Math.round((new Date(session.finalizedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
        : '';

      const row = [
        sessionId,
        session?.startedAt?.toISOString() || '',
        session?.finalizedAt?.toISOString() || '',
        duration.toString()
      ];

      // Add answer data for each question
      questions.forEach(question => {
        const answer = sessionAnswersList.find(a => a.questionId === question.id);
        
        if (question.type === 'MATRIX_SINGLE' || question.type === 'MATRIX_MULTIPLE' || question.type === 'BIPOLAR_MATRIX') {
          // For matrix questions, create a cell for each item-scale combination
          question.items?.forEach((item: any) => {
            question.scales?.forEach((scale: any) => {
              if (answer?.jsonValue) {
                const matrixData = answer.jsonValue;
                const itemValue = matrixData[item.id];
                const isSelected = Array.isArray(itemValue) 
                  ? itemValue.includes(scale.id)
                  : itemValue === scale.id;
                row.push(isSelected ? '1' : '0');
              } else {
                row.push('0');
              }
            });
          });
        } else {
          // For other question types, use the formatted answer
          let answerValue = '';
          if (answer) {
            if (answer.choices && answer.choices.length > 0) {
              answerValue = answer.choices.join(', ');
            } else if (answer.textValue) {
              answerValue = answer.textValue;
            } else if (answer.numericValue !== null) {
              answerValue = answer.numericValue.toString();
            } else if (answer.booleanValue !== null) {
              answerValue = answer.booleanValue.toString();
            } else if (answer.jsonValue) {
              answerValue = JSON.stringify(answer.jsonValue);
            }
          }
          row.push(answerValue);
        }
      });

      rows.push(row);
    });

    // Generate CSV content
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="survey-${surveyId}-answers.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error("Error exporting answers:", error);
    return res.status(500).json({ error: "Failed to export answers" });
  }
});

/**
 * GET /surveys/:id/answers/:answerId
 * Get a specific answer
 * Requires: SB access with VIEWER role
 */
router.get("/:id/answers/:answerId", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, answerId } = req.params;

    const answer = await prisma.answer.findFirst({
      where: { id: answerId, surveyId, tenantId },
      include: {
        question: {
          select: {
            id: true,
            variableName: true,
            titleTemplate: true,
            type: true
          }
        },
        session: {
          select: {
            id: true,
            status: true,
            startedAt: true
          }
        }
      }
    });

    if (!answer) {
      return res.status(404).json({ error: "Answer not found" });
    }

    return res.json({ answer });
  } catch (error) {
    console.error("Error fetching answer:", error);
    return res.status(500).json({ error: "Failed to fetch answer" });
  }
});

/**
 * PUT /surveys/:id/answers/:answerId
 * Update an answer
 * Requires: SB access with VIEWER role
 */
router.put("/:id/answers/:answerId", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, answerId } = req.params;

    // Validate request body
    const validation = validateRequest(updateAnswerSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;

    // Verify answer exists and belongs to tenant
    const existingAnswer = await prisma.answer.findFirst({
      where: { id: answerId, surveyId, tenantId },
      include: {
        question: true
      }
    });

    if (!existingAnswer) {
      return res.status(404).json({ error: "Answer not found" });
    }

    // Get question configuration
    const questionConfig = {
      minValue: existingAnswer.question.minValue,
      maxValue: existingAnswer.question.maxValue,
      stepValue: existingAnswer.question.stepValue,
      defaultValue: existingAnswer.question.defaultValue,
      scaleMinLabel: existingAnswer.question.scaleMinLabel,
      scaleMaxLabel: existingAnswer.question.scaleMaxLabel,
      scaleSteps: existingAnswer.question.scaleSteps,
      maxSelections: existingAnswer.question.maxSelections,
      allowOther: existingAnswer.question.allowOther,
      otherLabel: existingAnswer.question.otherLabel,
      allowedFileTypes: existingAnswer.question.allowedFileTypes,
      maxFileSize: existingAnswer.question.maxFileSize,
      maxFiles: existingAnswer.question.maxFiles,
      dateFormat: existingAnswer.question.dateFormat,
      timeFormat: existingAnswer.question.timeFormat,
      minDate: existingAnswer.question.minDate,
      maxDate: existingAnswer.question.maxDate,
      phoneFormat: existingAnswer.question.phoneFormat,
      countryCode: existingAnswer.question.countryCode,
      urlProtocol: existingAnswer.question.urlProtocol,
      paymentAmount: existingAnswer.question.paymentAmount,
      currency: existingAnswer.question.currency,
      paymentMethods: existingAnswer.question.paymentMethods,
      imageLayout: existingAnswer.question.imageLayout,
      imageSize: existingAnswer.question.imageSize,
      matrixType: existingAnswer.question.matrixType,
      showHeaders: existingAnswer.question.showHeaders,
      randomizeRows: existingAnswer.question.randomizeRows,
      randomizeColumns: existingAnswer.question.randomizeColumns,
      totalPoints: existingAnswer.question.totalPoints,
      allowZero: existingAnswer.question.allowZero,
      signatureWidth: existingAnswer.question.signatureWidth,
      signatureHeight: existingAnswer.question.signatureHeight,
      signatureColor: existingAnswer.question.signatureColor,
      consentText: existingAnswer.question.consentText,
      requireSignature: existingAnswer.question.requireSignature,
      collectName: existingAnswer.question.collectName,
      collectEmail: existingAnswer.question.collectEmail,
      collectPhone: existingAnswer.question.collectPhone,
      collectCompany: existingAnswer.question.collectCompany,
      collectAddress: existingAnswer.question.collectAddress,
      groupSize: existingAnswer.question.groupSize,
      groupLabel: existingAnswer.question.groupLabel,
      validation: existingAnswer.question.validation
    };

    // Process the answer based on question type
    const answerProcessing = AnswerProcessor.processAnswer(existingAnswer.question.type, data, questionConfig);
    if (!answerProcessing.success) {
      return res.status(400).json({ error: answerProcessing.error });
    }

    const processedAnswer = answerProcessing.processedAnswer!;

    const answer = await prisma.answer.update({
      where: { id: answerId },
      data: {
        choices: processedAnswer.choices !== undefined ? processedAnswer.choices : existingAnswer.choices,
        textValue: processedAnswer.textValue !== undefined ? processedAnswer.textValue : existingAnswer.textValue,
        numericValue: processedAnswer.numericValue !== undefined ? processedAnswer.numericValue : existingAnswer.numericValue,
        decimalValue: processedAnswer.decimalValue !== undefined ? processedAnswer.decimalValue : existingAnswer.decimalValue,
        dateValue: processedAnswer.dateValue !== undefined ? processedAnswer.dateValue : existingAnswer.dateValue,
        timeValue: processedAnswer.timeValue !== undefined ? processedAnswer.timeValue : existingAnswer.timeValue,
        jsonValue: processedAnswer.jsonValue !== undefined ? processedAnswer.jsonValue : existingAnswer.jsonValue,
        booleanValue: processedAnswer.booleanValue !== undefined ? processedAnswer.booleanValue : existingAnswer.booleanValue,
        emailValue: processedAnswer.emailValue !== undefined ? processedAnswer.emailValue : existingAnswer.emailValue,
        phoneValue: processedAnswer.phoneValue !== undefined ? processedAnswer.phoneValue : existingAnswer.phoneValue,
        urlValue: processedAnswer.urlValue !== undefined ? processedAnswer.urlValue : existingAnswer.urlValue,
        fileUrls: processedAnswer.fileUrls !== undefined ? processedAnswer.fileUrls : existingAnswer.fileUrls,
        signatureUrl: processedAnswer.signatureUrl !== undefined ? processedAnswer.signatureUrl : existingAnswer.signatureUrl,
        paymentId: processedAnswer.paymentId !== undefined ? processedAnswer.paymentId : existingAnswer.paymentId,
        paymentStatus: processedAnswer.paymentStatus !== undefined ? processedAnswer.paymentStatus : existingAnswer.paymentStatus
      }
    });

    return res.json({ answer });
  } catch (error) {
    console.error("Error updating answer:", error);
    return res.status(500).json({ error: "Failed to update answer" });
  }
});

/**
 * DELETE /surveys/:id/answers/:answerId
 * Delete an answer
 * Requires: SB access with VIEWER role
 */
router.delete("/:id/answers/:answerId", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, answerId } = req.params;

    // Verify answer exists and belongs to tenant
    const answer = await prisma.answer.findFirst({
      where: { id: answerId, surveyId, tenantId }
    });

    if (!answer) {
      return res.status(404).json({ error: "Answer not found" });
    }

    await prisma.answer.delete({
      where: { id: answerId }
    });

    return res.json({ message: "Answer deleted successfully" });
  } catch (error) {
    console.error("Error deleting answer:", error);
    return res.status(500).json({ error: "Failed to delete answer" });
  }
});

export default router;
