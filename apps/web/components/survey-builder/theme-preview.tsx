"use client";

import { useState } from 'react';
import { themes, getTheme, ThemeConfig } from '@/lib/themes';
import ThemeProvider from './preview/theme-provider';

interface ThemePreviewProps {
  selectedTheme: string;
  onThemeChange: (theme: string) => void;
}

export default function ThemePreview({ selectedTheme, onThemeChange }: ThemePreviewProps) {
  const [previewTheme, setPreviewTheme] = useState(selectedTheme);

  const handleThemeChange = (theme: string) => {
    setPreviewTheme(theme);
    onThemeChange(theme);
  };

  return (
    <div className="space-y-6">
      {/* Theme Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose Theme
        </label>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(themes).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => handleThemeChange(key)}
              className={`p-3 rounded-lg border-2 transition-all ${
                previewTheme === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-left">
                <div className="font-medium text-gray-900">{theme.displayName}</div>
                <div className="text-sm text-gray-500">{theme.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Theme Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preview
        </label>
        <ThemeProvider themeName={previewTheme}>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Preview Header */}
            <div 
              className="p-4 text-white"
              style={{
                background: `linear-gradient(135deg, ${getTheme(previewTheme).colors.primary} 0%, ${getTheme(previewTheme).colors.secondary} 100%)`
              }}
            >
              <h3 className="text-lg font-semibold">Sample Survey Title</h3>
              <p className="text-sm opacity-90">This is how your survey will look</p>
            </div>

            {/* Preview Content */}
            <div className="p-4 space-y-4" style={{ backgroundColor: getTheme(previewTheme).colors.background }}>
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: getTheme(previewTheme).colors.textSecondary }}>Page 1 of 3</span>
                  <span style={{ color: getTheme(previewTheme).colors.textSecondary }}>33% complete</span>
                </div>
                <div 
                  className="h-2 rounded-full"
                  style={{ backgroundColor: getTheme(previewTheme).colors.surface }}
                >
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      backgroundColor: getTheme(previewTheme).colors.primary,
                      width: '33%'
                    }}
                  />
                </div>
              </div>

              {/* Sample Question */}
              <div className="space-y-3">
                <label 
                  className="block font-medium"
                  style={{ color: getTheme(previewTheme).colors.text }}
                >
                  Q1: What is your favorite color?
                </label>
                <div className="space-y-2">
                  {['Red', 'Blue', 'Green'].map((option, index) => (
                    <label key={option} className="flex items-center">
                      <input
                        type="radio"
                        name="preview-question"
                        className="mr-3"
                        style={{ accentColor: getTheme(previewTheme).colors.primary }}
                      />
                      <span style={{ color: getTheme(previewTheme).colors.text }}>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sample Buttons */}
              <div className="flex justify-between pt-4">
                <button
                  className="px-4 py-2 rounded-md text-sm font-medium transition-all"
                  style={{
                    backgroundColor: getTheme(previewTheme).colors.background,
                    color: getTheme(previewTheme).colors.text,
                    border: `1px solid ${getTheme(previewTheme).colors.border}`
                  }}
                >
                  Previous
                </button>
                <button
                  className="px-4 py-2 rounded-md text-sm font-medium text-white transition-all"
                  style={{ backgroundColor: getTheme(previewTheme).colors.primary }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </ThemeProvider>
      </div>

      {/* Theme Details */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Theme Details
        </label>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Primary Color:</span>
              <div className="flex items-center mt-1">
                <div 
                  className="w-4 h-4 rounded mr-2"
                  style={{ backgroundColor: getTheme(previewTheme).colors.primary }}
                />
                <span className="text-gray-600">{getTheme(previewTheme).colors.primary}</span>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Secondary Color:</span>
              <div className="flex items-center mt-1">
                <div 
                  className="w-4 h-4 rounded mr-2"
                  style={{ backgroundColor: getTheme(previewTheme).colors.secondary }}
                />
                <span className="text-gray-600">{getTheme(previewTheme).colors.secondary}</span>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Font Family:</span>
              <span className="ml-2 text-gray-600">{getTheme(previewTheme).typography.fontFamily}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Border Radius:</span>
              <span className="ml-2 text-gray-600">{getTheme(previewTheme).borderRadius.md}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
