"use client";

import { useState, useEffect } from 'react';
import { Survey } from '@/lib/api/survey-api';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import { PageWithQuestions, pagesAPI } from '@/lib/api/pages-api';
import SurveyToolbar from './survey-toolbar';
import SurveySidebar from './survey-sidebar';
import BlockContainer from './block-container';
import { getApiHeaders } from '@/lib/api-headers';
import { config } from '@/lib/config';
interface SurveyWithCounts extends Survey {
  _count: {
    pages: number;
    questions: number;
    sessions: number;
  };
}

interface QuestionGroup {
  id: string;
  pageId: string;
  index: number;
  key?: string;
  titleTemplate?: string;
  descriptionTemplate?: string;
  innerOrderMode: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED';
}

interface SurveyCanvasProps {
  survey: SurveyWithCounts;
  pages: PageWithQuestions[];
  questions: QuestionWithDetails[];
  onSurveyUpdated: (survey: SurveyWithCounts) => void;
  onPageCreated: (page: PageWithQuestions) => void;
  onPageUpdated: (page: PageWithQuestions) => void;
  onPageDeleted: (pageId: string) => void;
  onQuestionCreated: (question: QuestionWithDetails) => void;
  onQuestionUpdated: (question: QuestionWithDetails) => void;
  onQuestionDeleted: (questionId: string) => void;
}

export default function SurveyCanvas({
  survey,
  pages,
  questions,
  onSurveyUpdated,
  onPageCreated,
  onPageUpdated,
  onPageDeleted,
  onQuestionCreated,
  onQuestionUpdated,
  onQuestionDeleted
}: SurveyCanvasProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectionType, setSelectionType] = useState<'survey' | 'block' | 'question'>('survey');
  const [selectedItem, setSelectedItem] = useState<any>(survey);
  const [groups, setGroups] = useState<QuestionGroup[]>([]);

  // Load groups for all pages
  useEffect(() => {
    loadAllGroups();
  }, [survey.id, pages]);

  const loadAllGroups = async () => {
    try {
      const allGroups: QuestionGroup[] = [];
      
      for (const page of pages) {
        const response = await fetch(`${config.api.surveyService}/api/surveys/${survey.id}/pages/${page.id}/groups`, {
          headers: getApiHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          allGroups.push(...(data.groups || []));
        }
      }
      
      setGroups(allGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const handleBlockSelect = (page: PageWithQuestions) => {
    setSelectedPageId(page.id);
    setSelectedQuestionId(null);
    setSelectionType('block');
    setSelectedItem(page);
  };

  const handleQuestionSelect = (question: QuestionWithDetails) => {
    setSelectedQuestionId(question.id);
    setSelectedPageId(null);
    setSelectionType('question');
    setSelectedItem(question);
  };

  const handleSurveySelect = () => {
    setSelectedQuestionId(null);
    setSelectedPageId(null);
    setSelectionType('survey');
    setSelectedItem(survey);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // If clicking on the canvas background (not on blocks or questions), select survey
    if (e.target === e.currentTarget) {
      handleSurveySelect();
    }
  };

  const handleGroupCreated = (newGroup: QuestionGroup) => {
    setGroups(prev => [...prev, newGroup]);
  };

  const handleGroupUpdated = (updatedGroup: QuestionGroup) => {
    setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
  };

  const handleGroupDeleted = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar */}
      <SurveySidebar
        surveyId={survey.id}
        selectionType={selectionType}
        selectedItem={selectedItem}
        onQuestionCreated={onQuestionCreated}
        onQuestionUpdated={onQuestionUpdated}
        onSurveyUpdated={onSurveyUpdated}
        allQuestions={questions}
        allPages={pages}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <SurveyToolbar
          survey={survey}
          onSurveyUpdated={onSurveyUpdated}
        />

        {/* Canvas Content */}
        <div 
          className="flex-1 overflow-auto bg-white" 
          onClick={handleCanvasClick}
        >
          <div className="max-w-4xl mx-auto py-8 px-6">
            {/* Survey Header */}
            <div 
              className={`mb-8 p-4 rounded-lg transition-all cursor-pointer ${
                selectionType === 'survey' ? 'bg-blue-50 ring-2 ring-blue-200' : 'hover:bg-gray-50'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleSurveySelect();
              }}
            >
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                {survey.title}
              </h1>
              {survey.description && (
                <p className="text-gray-600">{survey.description}</p>
              )}
            </div>

            {/* Blocks (Pages) */}
            <div className="space-y-6">
              {pages.map((page, pageIndex) => {
                const pageGroups = groups.filter(g => g.pageId === page.id);
                return (
                  <BlockContainer
                    key={page.id}
                    page={page}
                    pageIndex={pageIndex}
                    questions={questions.filter(q => q.pageId === page.id)}
                    groups={pageGroups}
                    allQuestions={questions}
                    selectedQuestionId={selectedQuestionId}
                    selectedPageId={selectedPageId}
                    onQuestionSelect={handleQuestionSelect}
                    onBlockSelect={() => handleBlockSelect(page)}
                    onPageUpdated={onPageUpdated}
                    onPageDeleted={onPageDeleted}
                    onQuestionCreated={onQuestionCreated}
                    onQuestionUpdated={onQuestionUpdated}
                    onQuestionDeleted={onQuestionDeleted}
                    onGroupCreated={handleGroupCreated}
                    onGroupUpdated={handleGroupUpdated}
                    onGroupDeleted={handleGroupDeleted}
                    surveyId={survey.id}
                  />
                );
              })}

              {/* Add New Block Button */}
              <AddBlockButton
                surveyId={survey.id}
                onPageCreated={onPageCreated}
                nextIndex={pages.length + 1}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AddBlockButtonProps {
  surveyId: string;
  onPageCreated: (page: PageWithQuestions) => void;
  nextIndex: number;
}

function AddBlockButton({ surveyId, onPageCreated, nextIndex }: AddBlockButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleAddBlock = async () => {
    try {
      setLoading(true);
      const newPage = await pagesAPI.createPage(surveyId, {
        titleTemplate: `Block ${nextIndex}`,
        descriptionTemplate: '',
        questionOrderMode: 'SEQUENTIAL'
      });
      onPageCreated(newPage);
    } catch (error) {
      console.error('Error adding block:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
      <button
        onClick={handleAddBlock}
        disabled={loading}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>{loading ? 'Adding...' : `Add Block ${nextIndex}`}</span>
      </button>
    </div>
  );
}
