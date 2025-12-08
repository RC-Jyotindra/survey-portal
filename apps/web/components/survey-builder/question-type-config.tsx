"use client";

import { useState, useEffect } from 'react';
import { QuestionType } from '@/lib/api/questions-api';
import { getApiHeaders } from '@/lib/api-headers';
import { config as appConfig } from '@/lib/config';
interface QuestionTypeConfigProps {
  questionType: QuestionType;
  question: any;
  surveyId: string;
  onQuestionUpdated: (question: any) => void;
  isUpdating?: boolean;
}

export default function QuestionTypeConfig({
  questionType,
  question,
  surveyId,
  onQuestionUpdated,
  isUpdating = false
}: QuestionTypeConfigProps) {
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    if (question) {
      setConfig({
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
        allowedFileTypes: question.allowedFileTypes || [],
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
        paymentMethods: question.paymentMethods || [],
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
        showIpsosBranding: question.showIpsosBranding || false,
        groupSize: question.groupSize,
        groupLabel: question.groupLabel
      });
    }
  }, [question]);

  const updateConfig = async (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);

    try {
      const response = await fetch(`${appConfig.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({ [field]: value })
      });

      if (!response.ok) {
        throw new Error('Failed to update question configuration');
      }

      const result = await response.json();
      onQuestionUpdated(result.question);
    } catch (error) {
      console.error('Error updating question configuration:', error);
      // Revert the change
      setConfig({ ...config });
    }
  };

  const renderNumericConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Minimum value</label>
        <input
          type="number"
          value={config.minValue || ''}
          onChange={(e) => updateConfig('minValue', e.target.value ? parseFloat(e.target.value) : null)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Maximum value</label>
        <input
          type="number"
          value={config.maxValue || ''}
          onChange={(e) => updateConfig('maxValue', e.target.value ? parseFloat(e.target.value) : null)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
      {questionType === 'SLIDER' && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Step value</label>
          <input
            type="number"
            step="0.1"
            value={config.stepValue || ''}
            onChange={(e) => updateConfig('stepValue', e.target.value ? parseFloat(e.target.value) : null)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isUpdating}
          />
        </div>
      )}
    </div>
  );

  const renderOpinionScaleConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Number of steps</label>
        <select
          value={config.scaleSteps || 5}
          onChange={(e) => updateConfig('scaleSteps', parseInt(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        >
          <option value={3}>3 steps</option>
          <option value={4}>4 steps</option>
          <option value={5}>5 steps</option>
          <option value={6}>6 steps</option>
          <option value={7}>7 steps</option>
          <option value={8}>8 steps</option>
          <option value={9}>9 steps</option>
          <option value={10}>10 steps</option>
          <option value={11}>11 steps</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Minimum label</label>
        <input
          type="text"
          value={config.scaleMinLabel || ''}
          onChange={(e) => updateConfig('scaleMinLabel', e.target.value)}
          placeholder="e.g., Poor, Disagree"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Maximum label</label>
        <input
          type="text"
          value={config.scaleMaxLabel || ''}
          onChange={(e) => updateConfig('scaleMaxLabel', e.target.value)}
          placeholder="e.g., Excellent, Agree"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
    </div>
  );

  const renderMultipleChoiceConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Maximum selections</label>
        <input
          type="number"
          min="1"
          value={config.maxSelections || ''}
          onChange={(e) => updateConfig('maxSelections', e.target.value ? parseInt(e.target.value) : null)}
          placeholder="Leave empty for unlimited"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="allowOther"
          checked={config.allowOther || false}
          onChange={(e) => updateConfig('allowOther', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={isUpdating}
        />
        <label htmlFor="allowOther" className="text-sm text-gray-900">
          Allow "Other" option
        </label>
      </div>
      {config.allowOther && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">"Other" label</label>
          <input
            type="text"
            value={config.otherLabel || 'Other'}
            onChange={(e) => updateConfig('otherLabel', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isUpdating}
          />
        </div>
      )}
    </div>
  );

  const renderFileUploadConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Allowed file types</label>
        <div className="space-y-2">
          {['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'txt', 'csv'].map((type) => (
            <label key={type} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.allowedFileTypes?.includes(type) || false}
                onChange={(e) => {
                  const currentTypes = config.allowedFileTypes || [];
                  const newTypes = e.target.checked
                    ? [...currentTypes, type]
                    : currentTypes.filter((t: string) => t !== type);
                  updateConfig('allowedFileTypes', newTypes);
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isUpdating}
              />
              <span className="text-sm text-gray-900">.{type}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Maximum file size (MB)</label>
        <input
          type="number"
          min="1"
          value={config.maxFileSize ? config.maxFileSize / 1024 / 1024 : ''}
          onChange={(e) => updateConfig('maxFileSize', e.target.value ? parseInt(e.target.value) * 1024 * 1024 : null)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Maximum number of files</label>
        <input
          type="number"
          min="1"
          value={config.maxFiles || 1}
          onChange={(e) => updateConfig('maxFiles', parseInt(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
    </div>
  );

  const renderDateTimeConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Date format</label>
        <select
          value={config.dateFormat || 'MM/DD/YYYY'}
          onChange={(e) => updateConfig('dateFormat', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        >
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>
      {questionType === 'TIME' && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Time format</label>
          <select
            value={config.timeFormat || '12h'}
            onChange={(e) => updateConfig('timeFormat', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isUpdating}
          >
            <option value="12h">12-hour (AM/PM)</option>
            <option value="24h">24-hour</option>
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-600 mb-1">Minimum date</label>
        <input
          type="date"
          value={config.minDate ? new Date(config.minDate).toISOString().split('T')[0] : ''}
          onChange={(e) => updateConfig('minDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Maximum date</label>
        <input
          type="date"
          value={config.maxDate ? new Date(config.maxDate).toISOString().split('T')[0] : ''}
          onChange={(e) => updateConfig('maxDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
    </div>
  );

  const renderPhoneConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Phone format</label>
        <select
          value={config.phoneFormat || 'US'}
          onChange={(e) => updateConfig('phoneFormat', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        >
          <option value="US">US Format</option>
          <option value="INTERNATIONAL">International</option>
          <option value="E164">E.164</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Default country code</label>
        <input
          type="text"
          value={config.countryCode || 'US'}
          onChange={(e) => updateConfig('countryCode', e.target.value)}
          placeholder="US"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
    </div>
  );

  const renderWebsiteConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">URL protocol</label>
        <select
          value={config.urlProtocol || 'https'}
          onChange={(e) => updateConfig('urlProtocol', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        >
          <option value="http">HTTP only</option>
          <option value="https">HTTPS only</option>
          <option value="both">Both HTTP and HTTPS</option>
        </select>
      </div>
    </div>
  );

  const renderPaymentConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Payment amount</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={config.paymentAmount || ''}
          onChange={(e) => updateConfig('paymentAmount', e.target.value ? parseFloat(e.target.value) : null)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Currency</label>
        <select
          value={config.currency || 'USD'}
          onChange={(e) => updateConfig('currency', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        >
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
          <option value="CAD">CAD (C$)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Payment methods</label>
        <div className="space-y-2">
          {['card', 'paypal', 'bank'].map((method) => (
            <label key={method} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.paymentMethods?.includes(method) || false}
                onChange={(e) => {
                  const currentMethods = config.paymentMethods || [];
                  const newMethods = e.target.checked
                    ? [...currentMethods, method]
                    : currentMethods.filter((m: string) => m !== method);
                  updateConfig('paymentMethods', newMethods);
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isUpdating}
              />
              <span className="text-sm text-gray-900 capitalize">{method}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPictureChoiceConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Image layout</label>
        <select
          value={config.imageLayout || 'grid'}
          onChange={(e) => updateConfig('imageLayout', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        >
          <option value="grid">Grid</option>
          <option value="list">List</option>
          <option value="carousel">Carousel</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Image size</label>
        <select
          value={config.imageSize || 'medium'}
          onChange={(e) => updateConfig('imageSize', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
    </div>
  );

  const renderMatrixConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Matrix type</label>
        <select
          value={config.matrixType || 'single'}
          onChange={(e) => updateConfig('matrixType', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        >
          <option value="single">Single choice per row</option>
          <option value="multiple">Multiple choice per row</option>
          <option value="rating">Rating scale per row</option>
        </select>
      </div>
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="showHeaders"
          checked={config.showHeaders !== false}
          onChange={(e) => updateConfig('showHeaders', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={isUpdating}
        />
        <label htmlFor="showHeaders" className="text-sm text-gray-900">
          Show column headers
        </label>
      </div>
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="randomizeRows"
          checked={config.randomizeRows || false}
          onChange={(e) => updateConfig('randomizeRows', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={isUpdating}
        />
        <label htmlFor="randomizeRows" className="text-sm text-gray-900">
          Randomize rows
        </label>
      </div>
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="randomizeColumns"
          checked={config.randomizeColumns || false}
          onChange={(e) => updateConfig('randomizeColumns', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={isUpdating}
        />
        <label htmlFor="randomizeColumns" className="text-sm text-gray-900">
          Randomize columns
        </label>
      </div>
    </div>
  );

  const renderConstantSumConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Total points to allocate</label>
        <input
          type="number"
          min="1"
          value={config.totalPoints || 100}
          onChange={(e) => updateConfig('totalPoints', parseInt(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="allowZero"
          checked={config.allowZero !== false}
          onChange={(e) => updateConfig('allowZero', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={isUpdating}
        />
        <label htmlFor="allowZero" className="text-sm text-gray-900">
          Allow zero points
        </label>
      </div>
    </div>
  );

  const renderSignatureConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Signature width (px)</label>
        <input
          type="number"
          min="100"
          max="800"
          value={config.signatureWidth || 400}
          onChange={(e) => updateConfig('signatureWidth', parseInt(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Signature height (px)</label>
        <input
          type="number"
          min="100"
          max="600"
          value={config.signatureHeight || 200}
          onChange={(e) => updateConfig('signatureHeight', parseInt(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Signature color</label>
        <input
          type="color"
          value={config.signatureColor || '#000000'}
          onChange={(e) => updateConfig('signatureColor', e.target.value)}
          className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
    </div>
  );

  const renderConsentConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Consent text</label>
        <textarea
          value={config.consentText || ''}
          onChange={(e) => updateConfig('consentText', e.target.value)}
          rows={4}
          placeholder="Enter the consent agreement text..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="requireSignature"
          checked={config.requireSignature || false}
          onChange={(e) => updateConfig('requireSignature', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={isUpdating}
        />
        <label htmlFor="requireSignature" className="text-sm text-gray-900">
          Require signature
        </label>
      </div>
    </div>
  );

  const renderContactFormConfig = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="showIpsosBranding"
          checked={config.showIpsosBranding || false}
          onChange={(e) => updateConfig('showIpsosBranding', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={isUpdating}
        />
        <label htmlFor="showIpsosBranding" className="text-sm text-gray-900">
          Show IPSOS branding
        </label>
      </div>
      
      <div className="space-y-2">
        <label className="block text-xs text-gray-600 mb-1">Collect information</label>
        {[
          { field: 'collectName', label: 'Name' },
          { field: 'collectEmail', label: 'Email' },
          { field: 'collectPhone', label: 'Phone' },
          { field: 'collectCompany', label: 'Company' }
        ].map(({ field, label }) => (
          <label key={field} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config[field] !== false}
              onChange={(e) => updateConfig(field, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isUpdating}
            />
            <span className="text-sm text-gray-900">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderGroupConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Group size</label>
        <input
          type="number"
          min="2"
          max="10"
          value={config.groupSize || 3}
          onChange={(e) => updateConfig('groupSize', parseInt(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Group label</label>
        <input
          type="text"
          value={config.groupLabel || ''}
          onChange={(e) => updateConfig('groupLabel', e.target.value)}
          placeholder="e.g., Group, Set, Category"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
      </div>
    </div>
  );

  // Render configuration based on question type
  const renderConfig = () => {
    switch (questionType) {
      case 'NUMBER':
      case 'DECIMAL':
      case 'SLIDER':
        return renderNumericConfig();
      case 'SINGLE_CHOICE':
      case 'MULTIPLE_CHOICE':
      case 'DROPDOWN':
        return renderMultipleChoiceConfig();
      case 'MATRIX':
        return renderMatrixConfig();
      case 'FILE_UPLOAD':
        return renderFileUploadConfig();
      case 'DATE':
      case 'TIME':
        return renderDateTimeConfig();
      case 'CONTACT_FORM':
        return renderContactFormConfig();
      default:
        return null;
    }
  };

  const configExists = [
    'NUMBER', 'DECIMAL', 'SLIDER', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 
    'DROPDOWN', 'MATRIX', 'FILE_UPLOAD', 'DATE', 'TIME', 'CONTACT_FORM'
  ].includes(questionType);

  if (!configExists) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Question Configuration</h4>
      {renderConfig()}
    </div>
  );
}
