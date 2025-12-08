"use client";

import { QuestionScale } from '@prisma/client';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import VisualDisplayLogicBuilder from './visual-display-logic-builder';

interface MatrixScaleDisplayLogicModalProps {
  isOpen: boolean;
  onClose: () => void;
  scale: QuestionScale;
  surveyId: string;
  allQuestions: QuestionWithDetails[];
  onLogicUpdated: (expressionId: string | null) => void;
}

export default function MatrixScaleDisplayLogicModal({
  isOpen,
  onClose,
  scale,
  surveyId,
  allQuestions,
  onLogicUpdated
}: MatrixScaleDisplayLogicModalProps) {
  return (
    <VisualDisplayLogicBuilder
      isOpen={isOpen}
      onClose={onClose}
      scale={scale}
      surveyId={surveyId}
      allQuestions={allQuestions}
      onLogicUpdated={onLogicUpdated}
    />
  );
}
