"use client";

import { QuestionType } from '@/lib/api/questions-api';

interface QuestionPreviewProps {
  questionType: QuestionType;
  question?: any;
  isPreview?: boolean;
  hideTitle?: boolean;
}

export default function QuestionPreview({ 
  questionType, 
  question, 
  isPreview = false,
  hideTitle = false
}: QuestionPreviewProps) {
  const getDefaultConfig = () => ({
    minValue: question?.minValue || 0,
    maxValue: question?.maxValue || 100,
    stepValue: question?.stepValue || 1,
    scaleSteps: question?.scaleSteps || 5,
    scaleMinLabel: question?.scaleMinLabel || 'Poor',
    scaleMaxLabel: question?.scaleMaxLabel || 'Excellent',
    maxSelections: question?.maxSelections || 1,
    allowOther: question?.allowOther || false,
    otherLabel: question?.otherLabel || 'Other',
    allowedFileTypes: question?.allowedFileTypes || ['jpg', 'png', 'pdf'],
    maxFileSize: question?.maxFileSize || 10485760,
    maxFiles: question?.maxFiles || 1,
    dateFormat: question?.dateFormat || 'MM/DD/YYYY',
    timeFormat: question?.timeFormat || '12h',
    phoneFormat: question?.phoneFormat || 'US',
    countryCode: question?.countryCode || 'US',
    urlProtocol: question?.urlProtocol || 'https',
    paymentAmount: question?.paymentAmount || 0,
    currency: question?.currency || 'USD',
    paymentMethods: question?.paymentMethods || ['card'],
    imageLayout: question?.imageLayout || 'grid',
    imageSize: question?.imageSize || 'medium',
    matrixType: question?.matrixType || 'single',
    showHeaders: question?.showHeaders !== false,
    randomizeRows: question?.randomizeRows || false,
    randomizeColumns: question?.randomizeColumns || false,
    totalPoints: question?.totalPoints || 100,
    allowZero: question?.allowZero !== false,
    signatureWidth: question?.signatureWidth || 400,
    signatureHeight: question?.signatureHeight || 200,
    signatureColor: question?.signatureColor || '#000000',
    consentText: question?.consentText || 'I agree to the terms and conditions.',
    requireSignature: question?.requireSignature || false,
    collectName: question?.collectName !== false,
    collectEmail: question?.collectEmail !== false,
    collectPhone: question?.collectPhone || false,
    collectCompany: question?.collectCompany || false,
    collectAddress: question?.collectAddress || false,
    showIpsosBranding: question?.showIpsosBranding || false,
    groupSize: question?.groupSize || 3,
    groupLabel: question?.groupLabel || 'Group'
  });

  const config = getDefaultConfig();

  const renderChoiceQuestion = (multiple = false) => (
    <div className="space-y-3">
      {question?.options?.map((option: any, index: number) => (
        <label key={option.id || index} className="flex items-center space-x-3">
          <input
            type={multiple ? "checkbox" : "radio"}
            name="preview-choice"
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled
          />
          <span className="text-sm text-gray-700">{option.labelTemplate || `Option ${index + 1}`}</span>
        </label>
      ))}
      {config.allowOther && (
        <label className="flex items-center space-x-3">
          <input
            type={multiple ? "checkbox" : "radio"}
            name="preview-choice"
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled
          />
          <span className="text-sm text-gray-700">{config.otherLabel}</span>
        </label>
      )}
    </div>
  );

  const renderDropdown = () => (
    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled>
      <option>Select an option...</option>
      {question?.options?.map((option: any, index: number) => (
        <option key={option.id || index} value={option.value}>
          {option.labelTemplate || `Option ${index + 1}`}
        </option>
      ))}
    </select>
  );

  const renderTextInput = (multiline = false) => {
    if (multiline) {
      return (
        <textarea
          rows={4}
          placeholder="Enter your answer here..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          disabled
        />
      );
    }
    return (
      <input
        type="text"
        placeholder="Enter your answer here..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled
      />
    );
  };

  const renderEmailInput = () => (
    <input
      type="email"
      placeholder="Enter your email address..."
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled
    />
  );

  const renderPhoneInput = () => (
    <input
      type="tel"
      placeholder={config.phoneFormat === 'US' ? '(555) 123-4567' : '+1 555 123 4567'}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled
    />
  );

  const renderWebsiteInput = () => (
    <input
      type="url"
      placeholder={`https://example.com`}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled
    />
  );

  const renderNumberInput = (decimal = false) => (
    <input
      type="number"
      step={decimal ? "0.01" : "1"}
      min={config.minValue}
      max={config.maxValue}
      placeholder="Enter a number..."
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled
    />
  );

  const renderSlider = () => (
    <div className="space-y-2">
      <input
        type="range"
        min={config.minValue}
        max={config.maxValue}
        step={config.stepValue}
        defaultValue={Math.floor((config.minValue + config.maxValue) / 2)}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        disabled
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{config.minValue}</span>
        <span>{config.maxValue}</span>
      </div>
    </div>
  );

  const renderOpinionScale = () => (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{config.scaleMinLabel}</span>
        <span>{config.scaleMaxLabel}</span>
      </div>
      <div className="flex justify-between">
        {Array.from({ length: config.scaleSteps }, (_, i) => (
          <label key={i} className="flex flex-col items-center space-y-1">
            <input
              type="radio"
              name="opinion-scale"
              value={i + 1}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              disabled
            />
            <span className="text-xs text-gray-600">{i + 1}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderConstantSum = () => (
    <div className="space-y-3">
      {question?.options?.map((option: any, index: number) => (
        <div key={option.id || index} className="flex items-center justify-between space-x-3">
          <span className="text-sm text-gray-700 flex-1">{option.labelTemplate || `Option ${index + 1}`}</span>
          <input
            type="number"
            min="0"
            max={config.totalPoints}
            placeholder="0"
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          />
        </div>
      ))}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex justify-between text-sm font-medium">
          <span>Total:</span>
          <span>{config.totalPoints} points</span>
        </div>
      </div>
    </div>
  );

  const renderDateInput = () => (
    <input
      type="date"
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled
    />
  );

  const renderTimeInput = () => (
    <input
      type="time"
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled
    />
  );

  const renderDateTimeInput = () => (
    <div className="space-y-3">
      <input
        type="date"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled
      />
      <input
        type="time"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled
      />
    </div>
  );

  const renderRankOrder = () => (
    <div className="space-y-2">
      {question?.options?.map((option: any, index: number) => (
        <div key={option.id || index} className="flex items-center space-x-3 p-2 border border-gray-200 rounded cursor-move">
          <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
            {index + 1}
          </div>
          <span className="text-sm text-gray-700 flex-1">{option.labelTemplate || `Option ${index + 1}`}</span>
          <div className="w-4 h-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMatrix = () => {
    const items = question?.items || [];
    const scales = question?.scales || [];
    const matrixType = question?.matrixType || 'single';

    // If no items or scales, show placeholder
    if (items.length === 0 || scales.length === 0) {
      return (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <p className="text-sm text-gray-500">
            {items.length === 0 && scales.length === 0 
              ? 'Add choices and scale points to create the matrix'
              : items.length === 0 
                ? 'Add choices to create the matrix rows'
                : 'Add scale points to create the matrix columns'
            }
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Question
              </th>
              {scales.map((scale: any) => (
                <th key={scale.id} className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {scale.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item: any) => (
              <tr key={item.id}>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                  {item.label}
                </td>
                        {scales.map((scale: any) => (
                          <td key={scale.id} className="border border-gray-300 px-4 py-3 text-center">
                            <input
                              type={questionType === 'MATRIX_MULTIPLE' ? 'checkbox' : 'radio'}
                              name={`matrix-${item.id}`}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              disabled
                            />
                          </td>
                        ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBipolarMatrix = () => {
    const rows = question?.options?.slice(0, 3) || [
      { id: 1, labelTemplate: 'Statement 1' },
      { id: 2, labelTemplate: 'Statement 2' },
      { id: 3, labelTemplate: 'Statement 3' }
    ];

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700"></th>
              {Array.from({ length: config.scaleSteps }, (_, i) => (
                <th key={i} className="border border-gray-300 p-2 text-center text-sm font-medium text-gray-700">
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.id}>
                <td className="border border-gray-300 p-2 text-sm text-gray-700">{row.labelTemplate}</td>
                {Array.from({ length: config.scaleSteps }, (_, i) => (
                  <td key={i} className="border border-gray-300 p-2 text-center">
                    <input
                      type="radio"
                      name={`bipolar-${row.id}`}
                      value={i + 1}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      disabled
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderGroupRank = () => (
    <div className="space-y-4">
      {Array.from({ length: 2 }, (_, groupIndex) => (
        <div key={groupIndex} className="border border-gray-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            {config.groupLabel} {groupIndex + 1}
          </h4>
          <div className="space-y-2">
            {question?.options?.slice(0, config.groupSize).map((option: any, index: number) => (
              <div key={option.id || index} className="flex items-center space-x-3 p-2 border border-gray-200 rounded cursor-move">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                  {index + 1}
                </div>
                <span className="text-sm text-gray-700 flex-1">{option.labelTemplate || `Item ${index + 1}`}</span>
                <div className="w-4 h-4 text-gray-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderGroupRating = () => (
    <div className="space-y-4">
      {Array.from({ length: 2 }, (_, groupIndex) => (
        <div key={groupIndex} className="border border-gray-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {config.groupLabel} {groupIndex + 1}
          </h4>
          <div className="space-y-3">
            {question?.options?.slice(0, config.groupSize).map((option: any, index: number) => (
              <div key={option.id || index} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 flex-1">{option.labelTemplate || `Item ${index + 1}`}</span>
                <div className="flex space-x-2">
                  {Array.from({ length: config.scaleSteps }, (_, i) => (
                    <label key={i} className="flex flex-col items-center space-y-1">
                      <input
                        type="radio"
                        name={`group-${groupIndex}-${option.id}`}
                        value={i + 1}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        disabled
                      />
                      <span className="text-xs text-gray-600">{i + 1}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderFileUpload = () => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <div className="text-gray-400 mb-2">
        <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
      <p className="text-xs text-gray-500">
        {config.allowedFileTypes.join(', ').toUpperCase()} up to {Math.round(config.maxFileSize / 1024 / 1024)}MB
      </p>
    </div>
  );

  const renderPhotoCapture = () => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <div className="text-gray-400 mb-2">
        <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <p className="text-sm text-gray-600 mb-2">Take a photo or upload from device</p>
      <p className="text-xs text-gray-500">JPG, PNG up to {Math.round(config.maxFileSize / 1024 / 1024)}MB</p>
    </div>
  );

  const renderPictureChoice = () => (
    <div className={`grid gap-3 ${config.imageLayout === 'list' ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {question?.options?.map((option: any, index: number) => (
        <label key={option.id || index} className="relative cursor-pointer">
          <input
            type="radio"
            name="picture-choice"
            className="sr-only"
            disabled
          />
          <div className={`border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 ${
            config.imageSize === 'small' ? 'h-24' : config.imageSize === 'large' ? 'h-48' : 'h-32'
          }`}>
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Image {index + 1}</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-1 text-center">{option.labelTemplate || `Option ${index + 1}`}</p>
        </label>
      ))}
    </div>
  );

  const renderPayment = () => (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-gray-900">
          {config.currency === 'USD' ? '$' : config.currency === 'EUR' ? '€' : config.currency === 'GBP' ? '£' : config.currency}
          {config.paymentAmount || '0.00'}
        </div>
        <p className="text-sm text-gray-600">Payment Amount</p>
      </div>
      <div className="space-y-3">
        {config.paymentMethods.map((method: string) => (
          <label key={method} className="flex items-center space-x-3 p-3 border border-gray-200 rounded cursor-pointer">
            <input
              type="radio"
              name="payment-method"
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              disabled
            />
            <span className="text-sm text-gray-700 capitalize">{method}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderSignature = () => (
    <div className="border border-gray-200 rounded-lg p-4">
      <div 
        className="border-2 border-dashed border-gray-300 rounded flex items-center justify-center"
        style={{ width: config.signatureWidth, height: config.signatureHeight }}
      >
        <div className="text-center text-gray-400">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <p className="text-sm">Click to sign</p>
        </div>
      </div>
    </div>
  );

  const renderConsentAgreement = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          {config.consentText}
        </p>
      </div>
      <div className="space-y-3">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled
          />
          <span className="text-sm text-gray-700">I agree to the terms above</span>
        </label>
        {config.requireSignature && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Signature required:</p>
            <div 
              className="border-2 border-dashed border-gray-300 rounded flex items-center justify-center"
              style={{ width: 300, height: 100 }}
            >
              <div className="text-center text-gray-400">
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <p className="text-xs">Click to sign</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMessage = () => {
    // Function to format text with basic HTML-like formatting
    const formatMessageText = (text: string) => {
      if (!text) return '';
      
      // Convert line breaks to <br> tags
      let formatted = text.replace(/\n/g, '<br>');
      
      // Convert **text** to <strong>text</strong> for bold
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Convert *text* to <em>text</em> for italic
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      return formatted;
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div 
          className="prose prose-sm max-w-none text-gray-900 leading-relaxed"
          dangerouslySetInnerHTML={{ 
            __html: formatMessageText(question?.titleTemplate || '') 
          }}
        />
      </div>
    );
  };

  const renderContactForm = () => (
    <div className="space-y-4">
      {/* IPSOS Branding Header */}
      {question?.showIpsosBranding && (
        <div className="border-2 border-gray-300 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-8">
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <img 
                src="https://garthtarr.com/wp-content/uploads/2016/05/Ipsos_logo.svg.png"
                alt="Ipsos Logo"
                className="w-24 h-24"
              />
            </div>
            
            {/* Right: Company Details */}
            <div className="flex-1 text-right">
              <h2 className="text-xl font-bold text-gray-900">Ipsos GmbH</h2>
              <p className="text-sm text-gray-600 uppercase tracking-wide">Qualitative Research</p>
              <div className="mt-4 text-sm text-gray-700">
                <p>Sachsenstraße 6</p>
                <p>D – 20097 Hamburg</p>
                <p>Tel. +49 (0)40 80096-0</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Form Fields */}
      {config.collectName && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            placeholder="Enter your full name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          />
        </div>
      )}
      {config.collectEmail && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            placeholder="Enter your email address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          />
        </div>
      )}
      {config.collectPhone && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <input
            type="tel"
            placeholder="Enter your phone number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          />
        </div>
      )}
      {config.collectCompany && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
          <input
            type="text"
            placeholder="Enter your company name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          />
        </div>
      )}
    </div>
  );

  const renderDescriptive = () => (
    <div className="prose prose-sm max-w-none">
      <p className="text-gray-700 leading-relaxed">
        This is a descriptive text block. You can use this to provide additional context, instructions, or information to respondents. 
        This text can include <strong>formatting</strong> and <em>emphasis</em> as needed.
      </p>
    </div>
  );

  const renderPreview = () => {
    switch (questionType) {
      case 'SINGLE_CHOICE':
        return renderChoiceQuestion(false);
      case 'MULTIPLE_CHOICE':
        return renderChoiceQuestion(true);
      case 'DROPDOWN':
        return renderDropdown();
      case 'YES_NO':
        return (
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input type="radio" name="yes-no" className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" disabled />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="radio" name="yes-no" className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" disabled />
              <span className="text-sm text-gray-700">No</span>
            </label>
          </div>
        );
      case 'TEXT':
        return renderTextInput(false);
      case 'TEXTAREA':
        return renderTextInput(true);
      case 'EMAIL':
        return renderEmailInput();
      case 'PHONE_NUMBER':
        return renderPhoneInput();
      case 'WEBSITE':
        return renderWebsiteInput();
      case 'NUMBER':
        return renderNumberInput(false);
      case 'DECIMAL':
        return renderNumberInput(true);
      case 'SLIDER':
        return renderSlider();
      case 'OPINION_SCALE':
        return renderOpinionScale();
      case 'CONSTANT_SUM':
        return renderConstantSum();
      case 'DATE':
        return renderDateInput();
      case 'TIME':
        return renderTimeInput();
      case 'DATETIME':
        return renderDateTimeInput();
      case 'RANK':
        return renderRankOrder();
            case 'MATRIX_SINGLE':
            case 'MATRIX_MULTIPLE':
              return renderMatrix();
      case 'BIPOLAR_MATRIX':
        return renderBipolarMatrix();
      case 'GROUP_RANK':
        return renderGroupRank();
      case 'GROUP_RATING':
        return renderGroupRating();
      case 'FILE_UPLOAD':
        return renderFileUpload();
      case 'PHOTO_CAPTURE':
        return renderPhotoCapture();
      case 'PICTURE_CHOICE':
        return renderPictureChoice();
      case 'PAYMENT':
        return renderPayment();
      case 'SIGNATURE':
        return renderSignature();
      case 'CONSENT_AGREEMENT':
        return renderConsentAgreement();
      case 'MESSAGE':
        return renderMessage();
      case 'CONTACT_FORM':
        return renderContactForm();
      case 'DESCRIPTIVE':
        return renderDescriptive();
      default:
        return <div className="text-gray-500 text-sm">Preview not available for this question type.</div>;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {!hideTitle && (
        <div className="mb-3">
          <h3 className="text-sm font-medium text-gray-900">
            {question?.titleTemplate || 'Sample Question'}
          </h3>
          {question?.descriptionTemplate && (
            <p className="text-xs text-gray-600 mt-1">{question.descriptionTemplate}</p>
          )}
        </div>
      )}
      {renderPreview()}
    </div>
  );
}
