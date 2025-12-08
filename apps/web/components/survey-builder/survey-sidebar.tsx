"use client";

import { useState, useEffect } from 'react';
import { QuestionWithDetails, QuestionType } from '@/lib/api/questions-api';
import { PageWithQuestions, pagesAPI } from '@/lib/api/pages-api';
import { getApiHeaders } from '@/lib/api-headers';
import SurveySettings from './survey-settings';
import QuestionBehaviorPanel from './question-behavior-panel';
import RandomizationModal from './randomization-modal';
import QuotasManagement from './quotas-management';
import QuestionQuotaAssignmentModal from './question-quota-assignment-modal';
import { 
  Circle, 
  Square, 
  ChevronDown, 
  CheckCircle, 
  Type, 
  FileText, 
  Mail, 
  Phone, 
  Globe, 
  Hash, 
  Sliders, 
  Star, 
  BarChart3, 
  Calendar, 
  Clock, 
  CalendarClock, 
  List, 
  Grid3X3, 
  ArrowLeftRight, 
  Layers, 
  Star as StarRating, 
  Upload, 
  Camera, 
  Image, 
  CreditCard, 
  PenTool, 
  FileCheck, 
  MessageSquare, 
  UserPlus, 
  File
} from 'lucide-react';
import QuestionGroupManager from './question-group-manager';
import GroupSettingsModal from './group-settings-modal';
import ShufflePreviewModal from './shuffle-preview-modal';
import { LoopBatteryPanel } from './loop-batteries';
import QuestionTypeConfig from './question-type-config';
import SuggestedChoicesModal from './suggested-choices-modal';
import MatrixEditor from './matrix-editor';
import { config } from '@/lib/config';
// Editable Option Component
function EditableOption({ 
  option, 
  surveyId, 
  questionId, 
  onOptionUpdated, 
  isUpdating 
}: { 
  option: any; 
  surveyId: string; 
  questionId: string; 
  onOptionUpdated: (question: any) => void;
  isUpdating: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLabel, setEditedLabel] = useState(option.labelTemplate);

  const handleSave = async () => {
    if (editedLabel.trim() === option.labelTemplate) {
      setIsEditing(false);
      return;
    }

    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${questionId}/options/${option.id}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({
          labelTemplate: editedLabel.trim(),
          value: editedLabel.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update option');
      }

      // Refresh question data
      const questionResponse = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${questionId}`, {
        headers: getApiHeaders()
      });

      if (questionResponse.ok) {
        const result = await questionResponse.json();
        onOptionUpdated(result.question);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating option:', error);
      alert('Failed to update option. Please try again.');
      setEditedLabel(option.labelTemplate);
    }
  };

  const handleCancel = () => {
    setEditedLabel(option.labelTemplate);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:border-gray-300 group">
      <div className="w-4 h-4 border border-gray-300 rounded flex-shrink-0"></div>
      {isEditing ? (
        <div className="flex-1 flex items-center space-x-1">
          <input
            type="text"
            value={editedLabel}
            onChange={(e) => setEditedLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="flex-1 text-sm border-none outline-none bg-transparent"
            autoFocus
            disabled={isUpdating}
          />
          <button
            onClick={handleSave}
            className="p-1 text-green-600 hover:text-green-700 opacity-0 group-hover:opacity-100"
            disabled={isUpdating}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-gray-600 hover:text-gray-700 opacity-0 group-hover:opacity-100"
            disabled={isUpdating}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div 
          className="flex-1 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
          onClick={() => setIsEditing(true)}
        >
          {option.labelTemplate}
        </div>
      )}
    </div>
  );
}

type SelectionType = 'survey' | 'block' | 'question';

interface SurveySidebarProps {
  surveyId: string;
  selectionType: SelectionType;
  selectedItem: any; // Can be Survey, Page, or Question
  onQuestionCreated: (question: QuestionWithDetails) => void;
  onQuestionUpdated?: (question: QuestionWithDetails) => void;
  onSurveyUpdated?: (survey: any) => void;
  onSelectionChange?: (type: SelectionType, item: any) => void;
  allQuestions?: QuestionWithDetails[];
  allPages?: PageWithQuestions[];
}

const QUESTION_TYPES = [
  // Basic Choice Types
  {
    type: 'SINGLE_CHOICE' as QuestionType,
    label: 'Single Choice',
    icon: <Circle className="w-5 h-5" />,
    description: 'Single answer selection',
    category: 'Choice'
  },
  {
    type: 'MULTIPLE_CHOICE' as QuestionType,
    label: 'Multiple Choice',
    icon: <Square className="w-5 h-5" />,
    description: 'Multiple answer selection',
    category: 'Choice'
  },
  {
    type: 'DROPDOWN' as QuestionType,
    label: 'Dropdown',
    icon: <ChevronDown className="w-5 h-5" />,
    description: 'Dropdown selection',
    category: 'Choice'
  },
  {
    type: 'YES_NO' as QuestionType,
    label: 'Yes/No',
    icon: <CheckCircle className="w-5 h-5" />,
    description: 'Boolean choice',
    category: 'Choice'
  },

  // Text Input Types
  {
    type: 'TEXT' as QuestionType,
    label: 'Text Entry',
    icon: <Type className="w-5 h-5" />,
    description: 'Single line text input',
    category: 'Text'
  },
  {
    type: 'TEXTAREA' as QuestionType,
    label: 'Long Text',
    icon: <FileText className="w-5 h-5" />,
    description: 'Multi-line text input',
    category: 'Text'
  },
  {
    type: 'EMAIL' as QuestionType,
    label: 'Email',
    icon: <Mail className="w-5 h-5" />,
    description: 'Email address input',
    category: 'Text'
  },
  {
    type: 'PHONE_NUMBER' as QuestionType,
    label: 'Phone Number',
    icon: <Phone className="w-5 h-5" />,
    description: 'Phone number input',
    category: 'Text'
  },
  {
    type: 'WEBSITE' as QuestionType,
    label: 'Website',
    icon: <Globe className="w-5 h-5" />,
    description: 'URL input',
    category: 'Text'
  },

  // Numeric Types
  {
    type: 'NUMBER' as QuestionType,
    label: 'Number',
    icon: <Hash className="w-5 h-5" />,
    description: 'Numeric input',
    category: 'Numeric'
  },
  {
    type: 'DECIMAL' as QuestionType,
    label: 'Decimal',
    icon: <Hash className="w-5 h-5" />,
    description: 'Decimal number input',
    category: 'Numeric'
  },
  {
    type: 'SLIDER' as QuestionType,
    label: 'Slider',
    icon: <Sliders className="w-5 h-5" />,
    description: 'Range slider input',
    category: 'Numeric'
  },
  {
    type: 'OPINION_SCALE' as QuestionType,
    label: 'Opinion Scale',
    icon: <Star className="w-5 h-5" />,
    description: 'Rating scale',
    category: 'Numeric'
  },
  {
    type: 'CONSTANT_SUM' as QuestionType,
    label: 'Constant Sum',
    icon: <BarChart3 className="w-5 h-5" />,
    description: 'Allocate points',
    category: 'Numeric'
  },

  // Date/Time Types
  {
    type: 'DATE' as QuestionType,
    label: 'Date',
    icon: <Calendar className="w-5 h-5" />,
    description: 'Date picker',
    category: 'Date/Time'
  },
  {
    type: 'TIME' as QuestionType,
    label: 'Time',
    icon: <Clock className="w-5 h-5" />,
    description: 'Time picker',
    category: 'Date/Time'
  },
  {
    type: 'DATETIME' as QuestionType,
    label: 'Date & Time',
    icon: <CalendarClock className="w-5 h-5" />,
    description: 'Date and time picker',
    category: 'Date/Time'
  },

  // Advanced Types
  {
    type: 'RANK' as QuestionType,
    label: 'Rank Order',
    icon: <List className="w-5 h-5" />,
    description: 'Drag and drop ranking',
    category: 'Advanced'
  },
  {
    type: 'MATRIX_SINGLE' as QuestionType,
    label: 'Matrix Table (Single Choice)',
    icon: <Grid3X3 className="w-5 h-5" />,
    description: 'Grid questions with single choice per row',
    category: 'Advanced'
  },
  {
    type: 'MATRIX_MULTIPLE' as QuestionType,
    label: 'Matrix Table (Multiple Choice)',
    icon: <Grid3X3 className="w-5 h-5" />,
    description: 'Grid questions with multiple choice per row',
    category: 'Advanced'
  },
  {
    type: 'BIPOLAR_MATRIX' as QuestionType,
    label: 'Bipolar Matrix',
    icon: <ArrowLeftRight className="w-5 h-5" />,
    description: 'Bipolar scales',
    category: 'Advanced'
  },
  {
    type: 'GROUP_RANK' as QuestionType,
    label: 'Group Rank',
    icon: <Layers className="w-5 h-5" />,
    description: 'Rank groups of items',
    category: 'Advanced'
  },
  {
    type: 'GROUP_RATING' as QuestionType,
    label: 'Group Rating',
    icon: <StarRating className="w-5 h-5" />,
    description: 'Rate groups of items',
    category: 'Advanced'
  },

  // File Types
  {
    type: 'FILE_UPLOAD' as QuestionType,
    label: 'File Upload',
    icon: <Upload className="w-5 h-5" />,
    description: 'Upload files',
    category: 'File'
  },
  {
    type: 'PHOTO_CAPTURE' as QuestionType,
    label: 'Photo Capture',
    icon: <Camera className="w-5 h-5" />,
    description: 'Camera capture',
    category: 'File'
  },

  // Special Types
  {
    type: 'PICTURE_CHOICE' as QuestionType,
    label: 'Picture Choice',
    icon: <Image className="w-5 h-5" />,
    description: 'Select from images',
    category: 'Special'
  },
  {
    type: 'PAYMENT' as QuestionType,
    label: 'Payment',
    icon: <CreditCard className="w-5 h-5" />,
    description: 'Collect payment',
    category: 'Special'
  },
  {
    type: 'SIGNATURE' as QuestionType,
    label: 'Signature',
    icon: <PenTool className="w-5 h-5" />,
    description: 'Digital signature',
    category: 'Special'
  },
  {
    type: 'CONSENT_AGREEMENT' as QuestionType,
    label: 'Consent Agreement',
    icon: <FileCheck className="w-5 h-5" />,
    description: 'Legal consent',
    category: 'Special'
  },
  {
    type: 'MESSAGE' as QuestionType,
    label: 'Message',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Informational text',
    category: 'Special'
  },
  {
    type: 'CONTACT_FORM' as QuestionType,
    label: 'Contact Form',
    icon: <UserPlus className="w-5 h-5" />,
    description: 'Contact information',
    category: 'Special'
  },
  {
    type: 'DESCRIPTIVE' as QuestionType,
    label: 'Descriptive Text',
    icon: <File className="w-5 h-5" />,
    description: 'Text/HTML block',
    category: 'Special'
  }
];

export default function SurveySidebar({
  surveyId,
  selectionType,
  selectedItem,
  onQuestionCreated,
  onQuestionUpdated,
  onSurveyUpdated,
  onSelectionChange,
  allQuestions = [],
  allPages = []
}: SurveySidebarProps) {
  const [isQuotasOpen, setIsQuotasOpen] = useState(false);

  const renderSidebarContent = () => {
    switch (selectionType) {
      case 'survey':
        return <SurveyOptionsPanel 
          survey={selectedItem} 
          onSurveyUpdated={onSurveyUpdated || (() => {})}
          onOpenQuotas={() => setIsQuotasOpen(true)}
        />;
      case 'block':
        return <BlockOptionsPanel block={selectedItem} surveyId={surveyId} onSurveyUpdated={onSurveyUpdated} allQuestions={allQuestions} allPages={allPages} />;
      case 'question':
        return <QuestionOptionsPanel 
          question={selectedItem} 
          surveyId={surveyId}
          onQuestionUpdated={onQuestionUpdated || (() => {})}
          allQuestions={allQuestions}
          allPages={allPages}
        />;
      default:
        return <DefaultPanel onQuestionCreated={onQuestionCreated} />;
    }
  };

  const getSidebarTitle = () => {
    switch (selectionType) {
      case 'survey':
        return 'Survey Settings';
      case 'block':
        return 'Edit block';
      case 'question':
        return 'Edit question';
      default:
        return 'Add elements';
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-100 rounded">
            {selectionType === 'survey' && (
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {selectionType === 'block' && (
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            )}
            {selectionType === 'question' && (
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h2 className="text-sm font-medium text-gray-900">{getSidebarTitle()}</h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderSidebarContent()}
      </div>

      {/* Quotas Management Modal */}
      {isQuotasOpen && (
        <QuotasManagement
          surveyId={surveyId}
          onClose={() => setIsQuotasOpen(false)}
        />
      )}
    </div>
  );
}

// Default Panel - Shows question types when nothing is selected
function DefaultPanel({ onQuestionCreated }: { onQuestionCreated: (question: QuestionWithDetails) => void }) {
  // Group question types by category
  const groupedTypes = QUESTION_TYPES.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category]!.push(type);
    return acc;
  }, {} as Record<string, typeof QUESTION_TYPES>);

  const categories = ['Choice', 'Text', 'Numeric', 'Date/Time', 'Advanced', 'File', 'Special'];

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Question types</h3>
        <p className="text-xs text-gray-500 mb-4">
          Drag a question type into your survey
        </p>
      </div>

      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category}>
            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-3">
              {category}
            </h4>
            <div className="space-y-2">
              {groupedTypes[category]?.map((questionType) => (
                <div
                  key={questionType.type}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md cursor-grab transition-all bg-white"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'question',
                      questionType: questionType.type
                    }));
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 text-blue-600">
                      {questionType.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-gray-900">
                        {questionType.label}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {questionType.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Compact Survey Settings Component for Sidebar
function CompactSurveySettings({ 
  survey, 
  onSurveyUpdated 
}: { 
  survey: any;
  onSurveyUpdated: (survey: any) => void;
}) {
  const [settings, setSettings] = useState({
    progressBar: true,
    allowBack: true,
    showPageNumbers: true,
    randomizeQuestions: false,
    theme: 'default'
  });

  const [target, setTarget] = useState({
    totalN: 0,
    softCloseN: 0,
    hardClose: true
  });

  const [targetStats, setTargetStats] = useState({
    completedCount: 0,
    remainingCount: 0,
    isSoftClose: false,
    isHardClose: false
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if there are any changes from the original values
  const checkForChanges = () => {
    const originalSettings = {
      progressBar: true,
      allowBack: true,
      showPageNumbers: true,
      randomizeQuestions: false,
      theme: 'default'
    };
    
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(settingsChanged);
  };

  // Load survey target data
  useEffect(() => {
    loadSurveyTarget();
  }, [survey.id]);

  useEffect(() => {
    checkForChanges();
  }, [settings, target]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${config.api.surveyService}/api/surveys/${survey.id}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({ settings })
      });

      if (!response.ok) {
        throw new Error('Failed to update survey settings');
      }

      const result = await response.json();
      onSurveyUpdated(result.survey);
      setHasChanges(false);
    } catch (error) {
      console.error('Error updating survey settings:', error);
      alert('Failed to update survey settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setTimeout(checkForChanges, 0);
  };

  const loadSurveyTarget = async () => {
    try {
      // First, try to get the target
      const targetResponse = await fetch(`${config.api.surveyService}/api/surveys/${survey.id}/target`, {
        headers: getApiHeaders()
      });

      if (targetResponse.ok) {
        const targetData = await targetResponse.json();
        setTarget({
          totalN: targetData.target?.totalN || 0,
          softCloseN: targetData.target?.softCloseN || 0,
          hardClose: targetData.target?.hardClose !== false
        });

        // Then try to get stats
        try {
          const statsResponse = await fetch(`${config.api.surveyService}/api/surveys/${survey.id}/target/stats`, {
            headers: getApiHeaders()
          });

          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setTargetStats({
              completedCount: statsData.stats?.completedCount || 0,
              remainingCount: statsData.stats?.remainingCount || 0,
              isSoftClose: statsData.stats?.isSoftClose || false,
              isHardClose: statsData.stats?.isHardClose || false
            });
          }
        } catch (statsError) {
          console.log('Stats not available yet');
        }
      } else if (targetResponse.status === 404) {
        // No target exists yet, this is normal
        console.log('No survey target found, using defaults');
      }
    } catch (error) {
      console.error('Error loading survey target:', error);
      // Don't prevent component from rendering if target loading fails
    }
  };

  const handleTargetChange = (field: string, value: any) => {
    setTarget(prev => ({ ...prev, [field]: value }));
    setTimeout(checkForChanges, 0);
  };

  const saveSurveyTarget = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${config.api.surveyService}/api/surveys/${survey.id}/target`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(target)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save survey target');
      }

      await loadSurveyTarget(); // Reload to get updated stats
    } catch (err: any) {
      console.error('Error saving survey target:', err);
      alert('Failed to save survey target. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* General Settings */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">General Settings</h3>
        
        <div className="space-y-4">
          {/* Progress Bar Setting */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Progress bar</h4>
              <p className="text-xs text-gray-500">Show progress indicator</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.progressBar}
                onChange={(e) => handleSettingChange('progressBar', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Allow Back Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Allow back navigation</h4>
              <p className="text-xs text-gray-500">Let respondents go back</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowBack}
                onChange={(e) => handleSettingChange('allowBack', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Show Page Numbers */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Show page numbers</h4>
              <p className="text-xs text-gray-500">Display page numbers</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showPageNumbers}
                onChange={(e) => handleSettingChange('showPageNumbers', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Randomize Questions */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Randomize questions</h4>
              <p className="text-xs text-gray-500">Randomize question order</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.randomizeQuestions}
                onChange={(e) => handleSettingChange('randomizeQuestions', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Theme</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-2">Choose theme</label>
            <select
              value={settings.theme}
              onChange={(e) => handleSettingChange('theme', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="default">Default</option>
              <option value="modern">Modern</option>
              <option value="minimal">Minimal</option>
              <option value="corporate">Corporate</option>
            </select>
          </div>

          {/* Theme Preview */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-2">Preview</div>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSettingChange('theme', 'default')}
                  className={`px-2 py-1 text-xs rounded ${
                    settings.theme === 'default' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  Default
                </button>
                <button
                  onClick={() => handleSettingChange('theme', 'modern')}
                  className={`px-2 py-1 text-xs rounded ${
                    settings.theme === 'modern' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  Modern
                </button>
                <button
                  onClick={() => handleSettingChange('theme', 'minimal')}
                  className={`px-2 py-1 text-xs rounded ${
                    settings.theme === 'minimal' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  Minimal
                </button>
                <button
                  onClick={() => handleSettingChange('theme', 'corporate')}
                  className={`px-2 py-1 text-xs rounded ${
                    settings.theme === 'corporate' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  Corporate
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Survey Targets Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Sample Size & Targets</h3>
        
        <div className="space-y-4">
          {/* Target N */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Target completes</label>
            <input
              type="number"
              min="1"
              value={target.totalN || ''}
              onChange={(e) => handleTargetChange('totalN', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Total completed responses to collect</p>
          </div>

          {/* Soft Close N */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Soft close threshold</label>
            <input
              type="number"
              min="0"
              max={target.totalN || undefined}
              value={target.softCloseN || ''}
              onChange={(e) => handleTargetChange('softCloseN', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Show "closing soon" message</p>
          </div>

          {/* Hard Close */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Hard close</h4>
              <p className="text-xs text-gray-500">Block new responses when target reached</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={target.hardClose}
                onChange={(e) => handleTargetChange('hardClose', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Current Stats */}
          {target.totalN > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Current Progress</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-lg font-bold text-blue-600">{targetStats.completedCount}</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{targetStats.remainingCount}</div>
                  <div className="text-xs text-gray-500">Remaining</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round((targetStats.completedCount / target.totalN) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((targetStats.completedCount / target.totalN) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Indicators */}
              {(targetStats.isSoftClose || targetStats.isHardClose) && (
                <div className="flex space-x-2">
                  {targetStats.isSoftClose && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Closing Soon
                    </span>
                  )}
                  {targetStats.isHardClose && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Closed
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Save Target Button */}
          {target.totalN > 0 && (
            <button
              onClick={saveSurveyTarget}
              disabled={loading}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Target'}
            </button>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={loading || !hasChanges}
          className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
            hasChanges
              ? 'text-white bg-blue-600 hover:bg-blue-700'
              : 'text-gray-700 bg-gray-100 border border-gray-300'
          }`}
        >
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

// Survey Options Panel - Shows when survey is selected
function SurveyOptionsPanel({ 
  survey, 
  onSurveyUpdated,
  onOpenQuotas
}: { 
  survey: any;
  onSurveyUpdated: (survey: any) => void;
  onOpenQuotas: () => void;
}) {
  const [currentView, setCurrentView] = useState<'main' | 'settings' | 'lookandfeel'>('main');

  // If we're in settings or lookandfeel view, show the settings component
  if (currentView === 'settings' || currentView === 'lookandfeel') {
    return (
      <div className="h-full flex flex-col">
        {/* Header with back button */}
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentView('main')}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-sm font-medium text-gray-900">
              {currentView === 'settings' ? 'Survey Options' : 'Look & Feel'}
            </h2>
          </div>
        </div>
        
        {/* Settings Component */}
        <div className="flex-1 overflow-y-auto">
          <CompactSurveySettings 
            survey={survey} 
            onSurveyUpdated={onSurveyUpdated}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Survey settings</h3>
        <div className="space-y-3">
          <button 
            onClick={() => setCurrentView('settings')}
            className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-blue-100 rounded">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Survey options</h4>
                <p className="text-xs text-gray-500">Configure survey behavior</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentView('lookandfeel')}
            className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-blue-100 rounded">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Look & feel</h4>
                <p className="text-xs text-gray-500">Customize appearance</p>
              </div>
            </div>
          </button>

          <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-blue-100 rounded">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Survey flow</h4>
                <p className="text-xs text-gray-500">Manage survey logic</p>
              </div>
            </div>
          </button>

          <button 
            onClick={onOpenQuotas}
            className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-blue-100 rounded">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Quotas</h4>
                <p className="text-xs text-gray-500">Manage sample quotas</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Block Options Panel - Shows when a block/page is selected
function BlockOptionsPanel({ block, surveyId, onSurveyUpdated, allQuestions, allPages }: { block: any; surveyId: string; onSurveyUpdated?: (item: any) => void; allQuestions?: QuestionWithDetails[]; allPages?: PageWithQuestions[] }) {
  const [isBlockBehaviorOpen, setIsBlockBehaviorOpen] = useState(true);
  const [isFormatOpen, setIsFormatOpen] = useState(false);
  const [isPageRandomizationOpen, setIsPageRandomizationOpen] = useState(false);
  const [isPageRandomizationLoading, setIsPageRandomizationLoading] = useState(false);
  const [isGroupShufflingOpen, setIsGroupShufflingOpen] = useState(false);
  const [isGroupShufflingLoading, setIsGroupShufflingLoading] = useState(false);
  const [isQuotasOpen, setIsQuotasOpen] = useState(false);
  const [isQuestionGroupsOpen, setIsQuestionGroupsOpen] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isShufflePreviewOpen, setIsShufflePreviewOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const handlePageRandomizationClick = () => {
    setIsPageRandomizationOpen(true);
  };

  const handlePageRandomizationClose = () => {
    setIsPageRandomizationOpen(false);
  };

  const handlePageRandomizationSave = async (questionOrderMode: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED') => {
    setIsPageRandomizationLoading(true);
    try {
      await pagesAPI.updatePageRandomization(surveyId, block.id, questionOrderMode);
      // Trigger a refresh of the page data
      if (onSurveyUpdated) {
        onSurveyUpdated(block);
      }
    } catch (error) {
      console.error('Error updating page randomization:', error);
      throw error;
    } finally {
      setIsPageRandomizationLoading(false);
    }
  };

  const handleGroupShufflingClick = () => {
    setIsGroupShufflingOpen(true);
  };

  const handleGroupShufflingClose = () => {
    setIsGroupShufflingOpen(false);
  };

  const handleGroupShufflingSave = async (groupOrderMode: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED') => {
    setIsGroupShufflingLoading(true);
    try {
      // Update the page's groupOrderMode
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/pages/${block.id}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({ groupOrderMode })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update group shuffling');
      }

      // Get the updated page data from the response
      const result = await response.json();
      const updatedPage = result.page;

      // Trigger a refresh of the page data with the updated page
      if (onSurveyUpdated) {
        onSurveyUpdated(updatedPage);
      }
    } catch (error) {
      console.error('Error updating group shuffling:', error);
      throw error;
    } finally {
      setIsGroupShufflingLoading(false);
    }
  };

  const handleEditGroup = (group: any) => {
    setSelectedGroup(group);
    setIsGroupSettingsOpen(true);
  };

  const handleGroupUpdated = (updatedGroup: any) => {
    // Refresh the page data
    if (onSurveyUpdated) {
      onSurveyUpdated(block);
    }
  };

  const handleGroupCreated = (newGroup: any) => {
    // Refresh the page data
    if (onSurveyUpdated) {
      onSurveyUpdated(block);
    }
  };

  const handleGroupDeleted = (groupId: string) => {
    // Refresh the page data
    if (onSurveyUpdated) {
      onSurveyUpdated(block);
    }
  };

  const handleShufflePreview = () => {
    setIsShufflePreviewOpen(true);
  };

  // Debug logging
  useEffect(() => {
    console.log('BlockOptionsPanel - block:', block);
    console.log('BlockOptionsPanel - block.id:', block?.id);
    console.log('BlockOptionsPanel - surveyId:', surveyId);
  }, [block, surveyId]);

  return (
    <div className="p-4 space-y-4">
      {/* Block behavior section */}
      <div>
        <button
          onClick={() => setIsBlockBehaviorOpen(!isBlockBehaviorOpen)}
          className="flex items-center justify-between w-full py-2"
        >
          <span className="text-sm font-medium text-gray-900">▼ Block behavior</span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isBlockBehaviorOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isBlockBehaviorOpen && (
          <div className="space-y-3 mt-3">
            <button 
              onClick={handlePageRandomizationClick}
              className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-blue-100 rounded">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Question randomization</h4>
                    <p className="text-xs text-gray-500">
                      {block?.questionOrderMode && block.questionOrderMode !== 'SEQUENTIAL' 
                        ? `Question order: ${block.questionOrderMode}` 
                        : 'Randomize question order'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {block?.questionOrderMode && block.questionOrderMode !== 'SEQUENTIAL' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Active
                    </span>
                  )}
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Group Shuffling Button */}
            <button 
              onClick={handleGroupShufflingClick}
              className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-purple-100 rounded">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Group shuffling</h4>
                    <p className="text-xs text-gray-500">
                      {block?.groupOrderMode && block.groupOrderMode !== 'SEQUENTIAL' 
                        ? `Group order: ${block.groupOrderMode}` 
                        : 'Shuffle question groups'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {block?.groupOrderMode && block.groupOrderMode !== 'SEQUENTIAL' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Active
                    </span>
                  )}
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Preview Shuffle Button */}
            {block?.groupOrderMode && block.groupOrderMode !== 'SEQUENTIAL' && (
              <button 
                onClick={() => setIsShufflePreviewOpen(true)}
                className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-green-100 rounded">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Preview shuffle</h4>
                      <p className="text-xs text-gray-500">See how groups will be ordered</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}

            {/* Loop & Merge Section */}
            <LoopBatteryPanel
              surveyId={surveyId}
              pageId={block.id}
              allQuestions={allQuestions || []}
              allPages={allPages || []}
              onLoopBatteryCreated={(battery) => {
                // TODO: Handle loop battery creation
                console.log('Loop battery created:', battery);
              }}
              onLoopBatteryUpdated={(battery) => {
                // TODO: Handle loop battery update
                console.log('Loop battery updated:', battery);
              }}
              onLoopBatteryDeleted={(batteryId) => {
                // TODO: Handle loop battery deletion
                console.log('Loop battery deleted:', batteryId);
              }}
            />

            <button 
              onClick={() => setIsQuestionGroupsOpen(!isQuestionGroupsOpen)}
              className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-blue-100 rounded">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Question Groups</h4>
                    <p className="text-xs text-gray-500">Organize questions into groups</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {block?.groupOrderMode && block.groupOrderMode !== 'SEQUENTIAL' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {block.groupOrderMode}
                    </span>
                  )}
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Format section */}
      <div>
        <button
          onClick={() => setIsFormatOpen(!isFormatOpen)}
          className="flex items-center justify-between w-full py-2"
        >
          <span className="text-sm font-medium text-gray-900">▼ Format</span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isFormatOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isFormatOpen && (
          <div className="space-y-3 mt-3">
            <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-blue-100 rounded">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Next/Previous button text</h4>
                  <p className="text-xs text-gray-500">Customize navigation</p>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Question Groups Section */}
      {isQuestionGroupsOpen && block?.id && (
        <div className="mt-4">
          <QuestionGroupManager
            pageId={block.id}
            surveyId={surveyId}
            allQuestions={allQuestions || []}
            onQuestionsUpdated={() => {}}
            onGroupCreated={handleGroupCreated}
            onGroupUpdated={handleGroupUpdated}
            onGroupDeleted={handleGroupDeleted}
          />
        </div>
      )}

      {/* Show message when block.id is missing */}
      {isQuestionGroupsOpen && !block?.id && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-800">
            <strong>Warning:</strong> Page ID is missing. Please ensure a page is properly selected.
          </div>
        </div>
      )}

      {/* Page Randomization Modal */}
      <RandomizationModal
        isOpen={isPageRandomizationOpen}
        onClose={handlePageRandomizationClose}
        type="page"
        currentMode={block?.questionOrderMode || 'SEQUENTIAL'}
        onSave={handlePageRandomizationSave}
        isLoading={isPageRandomizationLoading}
      />

      {/* Group Shuffling Modal */}
      <RandomizationModal
        isOpen={isGroupShufflingOpen}
        onClose={handleGroupShufflingClose}
        type="group"
        currentMode={block?.groupOrderMode || 'SEQUENTIAL'}
        onSave={handleGroupShufflingSave}
        isLoading={isGroupShufflingLoading}
      />

      {/* Group Settings Modal */}
      <GroupSettingsModal
        isOpen={isGroupSettingsOpen}
        onClose={() => {
          setIsGroupSettingsOpen(false);
          setSelectedGroup(null);
        }}
        group={selectedGroup}
        surveyId={surveyId}
        onGroupUpdated={handleGroupUpdated}
      />

      {/* Shuffle Preview Modal */}
      {block?.id && (
        <ShufflePreviewModal
          isOpen={isShufflePreviewOpen}
          onClose={() => setIsShufflePreviewOpen(false)}
          pageId={block.id}
          surveyId={surveyId}
          groupOrderMode={block?.groupOrderMode || 'SEQUENTIAL'}
        />
      )}
    </div>
  );
}

// Question Options Panel - Shows when a question is selected
function QuestionOptionsPanel({ 
  question, 
  surveyId, 
  onQuestionUpdated,
  allQuestions = [],
  allPages = []
}: { 
  question: any;
  surveyId: string;
  onQuestionUpdated: (question: any) => void;
  allQuestions?: QuestionWithDetails[];
  allPages?: PageWithQuestions[];
}) {
  const [questionType, setQuestionType] = useState(question?.type || 'SINGLE_CHOICE');
  const [allowMultiple, setAllowMultiple] = useState(question?.type === 'MULTIPLE_CHOICE');
  const [numChoices, setNumChoices] = useState(question?.options?.length || 3);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showQuestionTypeDropdown, setShowQuestionTypeDropdown] = useState(false);
  
  const [isAnswerTypeOpen, setIsAnswerTypeOpen] = useState(true);
  const [isChoicesOpen, setIsChoicesOpen] = useState(true);
  const [isQuotaAssignmentOpen, setIsQuotaAssignmentOpen] = useState(false);
  const [isQuotaAssignmentModalOpen, setIsQuotaAssignmentModalOpen] = useState(false);
  const [questionQuotas, setQuestionQuotas] = useState<any[]>([]);
  const [isSuggestedChoicesOpen, setIsSuggestedChoicesOpen] = useState(false);
  const [isSuggestedChoicesModalOpen, setIsSuggestedChoicesModalOpen] = useState(false);

  // Group question types by category
  const categories = ['Choice', 'Text', 'Numeric', 'Date/Time', 'Advanced', 'File', 'Special'];
  const groupedTypes = categories.reduce((acc, category) => {
    acc[category] = QUESTION_TYPES.filter(qt => qt.category === category);
    return acc;
  }, {} as Record<string, typeof QUESTION_TYPES>);

  // Sync state when question changes
  useEffect(() => {
    if (question) {
      setQuestionType(question.type || 'SINGLE_CHOICE');
      setAllowMultiple(question.type === 'MULTIPLE_CHOICE');
      setNumChoices(question.options?.length || 0);
      loadQuestionQuotas();
    }
  }, [question]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showQuestionTypeDropdown) {
        const target = event.target as Element;
        if (!target.closest('.question-type-dropdown')) {
          setShowQuestionTypeDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQuestionTypeDropdown]);

  const loadQuestionQuotas = async () => {
    if (!question?.id) return;
    
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/quotas`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        // Filter quotas that are related to this question
        const questionRelatedQuotas = data.quotaPlans?.filter((plan: any) => 
          plan.buckets?.some((bucket: any) => bucket.questionId === question.id)
        ) || [];
        
        // Flatten all buckets for this question
        const allBuckets = questionRelatedQuotas.flatMap((plan: any) => 
          plan.buckets?.filter((bucket: any) => bucket.questionId === question.id) || []
        );
        
        setQuestionQuotas(allBuckets);
      }
    } catch (error) {
      console.error('Error loading question quotas:', error);
    }
  };

  const handleQuestionTypeChange = async (newType: string) => {
    setQuestionType(newType);
    setIsUpdating(true);
    
    try {
      // Update question type via API
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({ type: newType })
      });

      if (!response.ok) {
        throw new Error('Failed to update question type');
      }

      const result = await response.json();
      onQuestionUpdated(result.question);
      
      // Update allowMultiple based on new type
      if (newType === 'MULTIPLE_CHOICE') {
        setAllowMultiple(true);
      } else if (newType === 'SINGLE_CHOICE') {
        setAllowMultiple(false);
      }
    } catch (error) {
      console.error('Error updating question type:', error);
      alert('Failed to update question type. Please try again.');
      // Revert the change
      setQuestionType(question?.type || 'SINGLE_CHOICE');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAnswerTypeChange = async (isMultiple: boolean) => {
    setAllowMultiple(isMultiple);
    setIsUpdating(true);
    
    try {
      const newType = isMultiple ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE';
      
      // Update question type via API
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({ type: newType })
      });

      if (!response.ok) {
        throw new Error('Failed to update answer type');
      }

      const result = await response.json();
      onQuestionUpdated(result.question);
      setQuestionType(newType);
    } catch (error) {
      console.error('Error updating answer type:', error);
      alert('Failed to update answer type. Please try again.');
      // Revert the change
      setAllowMultiple(question?.type === 'MULTIPLE_CHOICE');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChoicesChange = async (newCount: number) => {
    const currentCount = question?.options?.length || 0;
    setNumChoices(newCount);
    setIsUpdating(true);
    
    try {
      if (newCount > currentCount) {
        // Add new options
        for (let i = currentCount; i < newCount; i++) {
          const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}/options`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              questionId: question.id,
              value: `Choice ${i + 1}`,
              labelTemplate: `Choice ${i + 1}`,
              exclusive: false
            })
          });

          if (!response.ok) {
            throw new Error('Failed to add option');
          }
        }
      } else if (newCount < currentCount) {
        // Remove excess options
        const optionsToRemove = question.options.slice(newCount);
        for (const option of optionsToRemove) {
          const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}/options/${option.id}`, {
            method: 'DELETE',
            headers: getApiHeaders()
          });

          if (!response.ok) {
            throw new Error('Failed to remove option');
          }
        }
      }

      // Refresh question data
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        onQuestionUpdated(result.question);
      }
    } catch (error) {
      console.error('Error updating choices:', error);
      alert('Failed to update choices. Please try again.');
      // Revert the change
      setNumChoices(question?.options?.length || 0);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Question type section */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Question type</h3>
        <div className="relative question-type-dropdown">
          <button
            type="button"
            onClick={() => setShowQuestionTypeDropdown(!showQuestionTypeDropdown)}
            disabled={isUpdating}
            className="w-full p-3 pr-8 border border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              {(() => {
                const selectedType = QUESTION_TYPES.find(qt => qt.type === questionType);
                return selectedType ? (
                  <>
                    <div className="text-blue-600">{selectedType.icon}</div>
                    <span>{selectedType.label}</span>
                  </>
                ) : (
                  <span>Select question type</span>
                );
              })()}
            </div>
            <ChevronDown className="w-4 h-4 text-blue-600" />
          </button>
          
          {showQuestionTypeDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {categories.map((category) => (
                <div key={category}>
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      {category} Questions
                    </h4>
                  </div>
                  {groupedTypes[category]?.map((questionType) => (
                    <button
                      key={questionType.type}
                      type="button"
                      onClick={() => {
                        handleQuestionTypeChange(questionType.type);
                        setShowQuestionTypeDropdown(false);
                      }}
                      className="w-full px-3 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none flex items-center space-x-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-blue-600">{questionType.icon}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {questionType.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {questionType.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Answer type section - only for choice questions */}
      {(questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && (
        <div>
          <button
            onClick={() => setIsAnswerTypeOpen(!isAnswerTypeOpen)}
            className="flex items-center justify-between w-full py-2"
          >
            <span className="text-sm font-medium text-gray-900">▼ Answer type</span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isAnswerTypeOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isAnswerTypeOpen && (
            <div className="space-y-3 mt-3">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="single-answer"
                  name="answerType"
                  checked={!allowMultiple}
                  onChange={() => handleAnswerTypeChange(false)}
                  disabled={isUpdating}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                />
                <label htmlFor="single-answer" className="text-sm text-gray-900">
                  Allow one answer
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="multiple-answers"
                  name="answerType"
                  checked={allowMultiple}
                  onChange={() => handleAnswerTypeChange(true)}
                  disabled={isUpdating}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                />
                <label htmlFor="multiple-answers" className="text-sm text-gray-900">
                  Allow multiple answers
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Choices section - only for choice questions */}
      {(questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE' || questionType === 'DROPDOWN') && (
        <div>
          <button
            onClick={() => setIsChoicesOpen(!isChoicesOpen)}
            className="flex items-center justify-between w-full py-2"
          >
            <span className="text-sm font-medium text-gray-900">▼ Choices</span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isChoicesOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isChoicesOpen && (
            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs text-gray-600 mb-2">Number of choices</label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleChoicesChange(Math.max(1, numChoices - 1))}
                    disabled={isUpdating}
                    className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="min-w-[3rem] text-center text-sm font-medium">{numChoices}</span>
                  <button
                    onClick={() => handleChoicesChange(numChoices + 1)}
                    disabled={isUpdating}
                    className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Editable Options List */}
              {question?.options && question.options.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs text-gray-600 mb-2">Edit choices</label>
                  {question.options.map((option: any) => (
                    <EditableOption
                      key={option.id}
                      option={option}
                      surveyId={surveyId}
                      questionId={question.id}
                      onOptionUpdated={onQuestionUpdated}
                      isUpdating={isUpdating}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <button 
                  onClick={() => setIsSuggestedChoicesModalOpen(true)}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-green-100 rounded">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Suggested Choices</h4>
                      <p className="text-xs text-gray-500">Use predefined choice sets</p>
                    </div>
                  </div>
                </button>

                <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-blue-100 rounded">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Randomize choices</h4>
                      <p className="text-xs text-gray-500">Shuffle choice order</p>
                    </div>
                  </div>
                </button>

                <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-blue-100 rounded">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Add "Other" choice</h4>
                      <p className="text-xs text-gray-500">Text entry option</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Question Type Configuration */}
      <QuestionTypeConfig
        questionType={questionType}
        question={question}
        surveyId={surveyId}
        onQuestionUpdated={onQuestionUpdated}
        isUpdating={isUpdating}
      />

      {/* Matrix Editor - only for matrix questions */}
      {(questionType === 'MATRIX_SINGLE' || questionType === 'MATRIX_MULTIPLE') && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Matrix Configuration</h3>
          <MatrixEditor
            question={question}
            surveyId={surveyId}
            onQuestionUpdated={onQuestionUpdated}
            isUpdating={isUpdating}
            allQuestions={allQuestions}
          />
        </div>
      )}

      {/* Question Behavior Panel */}
      <QuestionBehaviorPanel 
        question={question} 
        surveyId={surveyId} 
        onQuestionUpdated={onQuestionUpdated}
        allQuestions={allQuestions}
        allPages={allPages}
      />

      {/* Quota Assignment Section */}
      <div>
        <button
          onClick={() => setIsQuotaAssignmentOpen(!isQuotaAssignmentOpen)}
          className="flex items-center justify-between w-full py-2"
        >
          <span className="text-sm font-medium text-gray-900">▼ Quota Assignment</span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isQuotaAssignmentOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isQuotaAssignmentOpen && (
          <div className="space-y-3 mt-3">
            <button 
              onClick={() => {
                setIsQuotaAssignmentModalOpen(true);
              }}
              className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-blue-100 rounded">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Assign Quota to Question</h4>
                  <p className="text-xs text-gray-500">Set quota targets for this question's options</p>
                </div>
              </div>
            </button>

            {/* Current Quota Status */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Current Quota Status</h4>
              <div className="text-xs text-gray-500">
                {questionQuotas && questionQuotas.length > 0 ? (
                  <div className="space-y-1">
                    {questionQuotas.map((quota: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span>{quota.label}:</span>
                        <span className="font-medium">{quota.targetN} target</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>No quotas assigned to this question</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="border-t border-gray-200 pt-4 mt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Quick actions</h3>
        <div className="space-y-2">
          <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-blue-100 rounded">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Copy question</h4>
                <p className="text-xs text-gray-500">Duplicate this question</p>
              </div>
            </div>
          </button>

          <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-blue-100 rounded">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Delete question</h4>
                <p className="text-xs text-gray-500">Remove from survey</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Question Quota Assignment Modal */}
      <QuestionQuotaAssignmentModal
        isOpen={isQuotaAssignmentModalOpen}
        onClose={() => setIsQuotaAssignmentModalOpen(false)}
        question={question}
        surveyId={surveyId}
        onQuotaAssigned={(updatedQuestion) => {
          onQuestionUpdated(updatedQuestion);
          loadQuestionQuotas(); // Refresh the quota display
        }}
      />

      {/* Suggested Choices Modal */}
      <SuggestedChoicesModal
        isOpen={isSuggestedChoicesModalOpen}
        onClose={() => setIsSuggestedChoicesModalOpen(false)}
        questionId={question?.id || ''}
        surveyId={surveyId}
        onChoicesPopulated={onQuestionUpdated}
        currentChoicesCount={question?.options?.length || 0}
      />
    </div>
  );
}

function ToolsPanel() {
  return (
    <div className="p-4">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Survey tools</h3>
          <div className="space-y-2">
            <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="text-lg">📋</div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Survey flow</h4>
                  <p className="text-xs text-gray-500">Manage survey logic</p>
                </div>
              </div>
            </button>

            <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="text-lg">🎨</div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Look & feel</h4>
                  <p className="text-xs text-gray-500">Customize appearance</p>
                </div>
              </div>
            </button>

            <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="text-lg">⚙️</div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Survey options</h4>
                  <p className="text-xs text-gray-500">Configure settings</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Library</h3>
          <div className="space-y-2">
            <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="text-lg">📚</div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Question library</h4>
                  <p className="text-xs text-gray-500">Reuse questions</p>
                </div>
              </div>
            </button>

            <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="text-lg">🔄</div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Import questions</h4>
                  <p className="text-xs text-gray-500">From other surveys</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
