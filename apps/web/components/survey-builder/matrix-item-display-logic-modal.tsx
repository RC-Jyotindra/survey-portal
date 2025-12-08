"use client";

import { QuestionItem } from '@prisma/client';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import VisualDisplayLogicBuilder from './visual-display-logic-builder';

interface MatrixItemDisplayLogicModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: QuestionItem;
  surveyId: string;
  allQuestions: QuestionWithDetails[];
  onLogicUpdated: (expressionId: string | null) => void;
}

export default function MatrixItemDisplayLogicModal({
  isOpen,
  onClose,
  item,
  surveyId,
  allQuestions,
  onLogicUpdated
}: MatrixItemDisplayLogicModalProps) {
  return (
    <VisualDisplayLogicBuilder
      isOpen={isOpen}
      onClose={onClose}
      item={item}
      surveyId={surveyId}
      allQuestions={allQuestions}
      onLogicUpdated={onLogicUpdated}
    />
  );
}
