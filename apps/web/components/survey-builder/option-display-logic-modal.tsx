"use client";

import { QuestionOption } from '@prisma/client';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import VisualDisplayLogicBuilder from './visual-display-logic-builder';

interface OptionDisplayLogicModalProps {
  isOpen: boolean;
  onClose: () => void;
  option: QuestionOption;
  surveyId: string;
  allQuestions: QuestionWithDetails[];
  onLogicUpdated: (expressionId: string | null) => void;
}

export default function OptionDisplayLogicModal({
  isOpen,
  onClose,
  option,
  surveyId,
  allQuestions,
  onLogicUpdated
}: OptionDisplayLogicModalProps) {
  return (
    <VisualDisplayLogicBuilder
      isOpen={isOpen}
      onClose={onClose}
      option={option}
      surveyId={surveyId}
      allQuestions={allQuestions}
      onLogicUpdated={onLogicUpdated}
    />
  );
}