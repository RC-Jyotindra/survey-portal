"use client";

import { useState } from "react";
import Link from "next/link";

interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  questionCount: number;
  estimatedTime: string;
  tags: string[];
  preview: string[];
}

const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: "customer-satisfaction",
    name: "Customer Satisfaction Survey",
    description: "Measure customer satisfaction and gather feedback on your products or services",
    category: "Customer Feedback",
    questionCount: 12,
    estimatedTime: "5 minutes",
    tags: ["satisfaction", "feedback", "nps"],
    preview: [
      "How satisfied are you with our service?",
      "How likely are you to recommend us?",
      "What could we improve?"
    ]
  },
  {
    id: "employee-engagement",
    name: "Employee Engagement Survey",
    description: "Assess employee satisfaction, engagement, and workplace culture",
    category: "HR & Workplace",
    questionCount: 25,
    estimatedTime: "8 minutes",
    tags: ["hr", "engagement", "workplace"],
    preview: [
      "How satisfied are you with your current role?",
      "Do you feel valued by your manager?",
      "Would you recommend this company as a place to work?"
    ]
  },
  {
    id: "market-research",
    name: "Market Research Survey",
    description: "Understand your target market, customer preferences, and buying behavior",
    category: "Market Research",
    questionCount: 18,
    estimatedTime: "7 minutes",
    tags: ["market", "research", "demographics"],
    preview: [
      "What is your age group?",
      "How often do you purchase [product]?",
      "What factors influence your buying decisions?"
    ]
  },
  {
    id: "event-feedback",
    name: "Event Feedback Survey",
    description: "Collect feedback after events, conferences, or training sessions",
    category: "Event Management",
    questionCount: 10,
    estimatedTime: "3 minutes",
    tags: ["event", "feedback", "experience"],
    preview: [
      "How would you rate the overall event?",
      "Which sessions were most valuable?",
      "What topics would you like to see in future events?"
    ]
  },
  {
    id: "product-feedback",
    name: "Product Feedback Survey",
    description: "Gather insights about product features, usability, and improvement areas",
    category: "Product Development",
    questionCount: 15,
    estimatedTime: "6 minutes",
    tags: ["product", "usability", "features"],
    preview: [
      "How easy is our product to use?",
      "Which features do you use most often?",
      "What new features would you like to see?"
    ]
  },
  {
    id: "website-feedback",
    name: "Website User Experience Survey",
    description: "Evaluate website usability, navigation, and user experience",
    category: "UX Research",
    questionCount: 12,
    estimatedTime: "4 minutes",
    tags: ["website", "ux", "usability"],
    preview: [
      "How easy was it to find what you were looking for?",
      "How would you rate the website design?",
      "Did you encounter any issues during your visit?"
    ]
  }
];

const CATEGORIES = ["All", "Customer Feedback", "HR & Workplace", "Market Research", "Event Management", "Product Development", "UX Research"];

export function SurveyTemplateGallery() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const filteredTemplates = selectedCategory === "All" 
    ? SURVEY_TEMPLATES 
    : SURVEY_TEMPLATES.filter(template => template.category === selectedCategory);

  const handleUseTemplate = (templateId: string) => {
    // In a real implementation, this would redirect to create survey with template
    alert(`Using template: ${templateId}. This would redirect to survey creation with pre-filled questions.`);
  };

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose a Survey Template</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start with professionally designed templates or create your survey from scratch. 
            All templates are fully customizable to fit your needs.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                </div>
              </div>

              <div className="flex items-center text-sm text-gray-500 mb-4 space-x-4">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {template.questionCount} questions
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ~{template.estimatedTime}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Preview Questions */}
              {hoveredTemplate === template.id && (
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Sample Questions:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {template.preview.map((question, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => handleUseTemplate(template.id)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Use Template
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Start from Scratch Option */}
        <div className="border-t border-gray-200 pt-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Or Start From Scratch</h3>
            <p className="text-gray-600 mb-6">
              Have a specific vision? Create a completely custom survey tailored to your exact needs.
            </p>
            <Link
              href="/survey-builder/create"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Blank Survey
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
