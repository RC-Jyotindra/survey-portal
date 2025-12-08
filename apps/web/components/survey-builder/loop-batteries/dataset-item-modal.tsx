"use client";

import { getApiHeaders } from '@/lib/api-headers';
import { useState, useEffect } from 'react';
import { config } from '@/lib/config';
interface DatasetItem {
  id: string;
  batteryId: string;
  key: string;
  attributes: Record<string, any>;
  isActive: boolean;
  sortIndex?: number;
}

interface DatasetItemModalProps {
  surveyId: string;
  batteryId: string;
  editingItem?: DatasetItem | null;
  onItemCreated?: (item: DatasetItem) => void;
  onItemUpdated?: (item: DatasetItem) => void;
  onClose: () => void;
}

export default function DatasetItemModal({
  surveyId,
  batteryId,
  editingItem,
  onItemCreated,
  onItemUpdated,
  onClose
}: DatasetItemModalProps) {
  const [formData, setFormData] = useState({
    key: '',
    label: '',
    attributes: {} as Record<string, any>
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customAttributes, setCustomAttributes] = useState<Array<{key: string, value: string}>>([]);

  const isEditing = !!editingItem;

  // Initialize form data
  useEffect(() => {
    if (editingItem) {
      setFormData({
        key: editingItem.key,
        label: editingItem.attributes?.label || editingItem.key,
        attributes: editingItem.attributes || {}
      });
      
      // Convert attributes to custom attributes array
      const attrs = editingItem.attributes || {};
      const customAttrs = Object.entries(attrs)
        .filter(([key]) => key !== 'label')
        .map(([key, value]) => ({ key, value: String(value) }));
      setCustomAttributes(customAttrs);
    }
  }, [editingItem]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCustomAttributeChange = (index: number, field: 'key' | 'value', value: string) => {
    const newAttributes = [...customAttributes];
    const currentAttr = newAttributes[index] || { key: '', value: '' };
    newAttributes[index] = { ...currentAttr, [field]: value };
    setCustomAttributes(newAttributes);
  };

  const addCustomAttribute = () => {
    setCustomAttributes(prev => [...prev, { key: '', value: '' }]);
  };

  const removeCustomAttribute = (index: number) => {
    setCustomAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.key.trim()) {
      newErrors.key = 'Key is required';
    }

    if (!formData.label.trim()) {
      newErrors.label = 'Label is required';
    }

    // Validate custom attributes
    const attributeKeys = new Set<string>();
    customAttributes.forEach((attr, index) => {
      if (attr.key.trim()) {
        if (attributeKeys.has(attr.key.trim())) {
          newErrors[`attr_${index}`] = 'Duplicate attribute key';
        }
        attributeKeys.add(attr.key.trim());
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Build attributes object
      const attributes: Record<string, any> = {
        label: formData.label
      };
      
      customAttributes.forEach(attr => {
        if (attr.key.trim() && attr.value.trim()) {
          attributes[attr.key.trim()] = attr.value.trim();
        }
      });

      const requestData = {
        key: formData.key.trim(),
        attributes,
        isActive: true,
        sortIndex: 0
      };

      const url = editingItem 
        ? `${config.api.surveyService}/api/surveys/${surveyId}/loop-batteries/${batteryId}/dataset-items/${editingItem.id}`
        : `${config.api.surveyService}/api/surveys/${surveyId}/loop-batteries/${batteryId}/dataset-items`;
      
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getApiHeaders(),
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} dataset item`);
      }

      const result = await response.json();
      
      if (isEditing) {
        onItemUpdated?.(result.datasetItem);
      } else {
        onItemCreated?.(result.datasetItem);
      }
    } catch (error: any) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} dataset item:`, error);
      alert(error.message || `Failed to ${isEditing ? 'update' : 'create'} dataset item. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Edit Dataset Item' : 'Create Dataset Item'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => handleInputChange('key', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.key ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., iphone_15_pro"
                />
                {errors.key && (
                  <p className="mt-1 text-sm text-red-600">{errors.key}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Used in {`{{loop.key}}`} variable. Should be unique and URL-friendly.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => handleInputChange('label', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.label ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., iPhone 15 Pro"
                />
                {errors.label && (
                  <p className="mt-1 text-sm text-red-600">{errors.label}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Used in {`{{loop.label}}`} variable. This is what users will see.
                </p>
              </div>
            </div>

            {/* Custom Attributes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Custom Attributes</h3>
                <button
                  type="button"
                  onClick={addCustomAttribute}
                  className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 border border-purple-200 rounded hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  + Add Attribute
                </button>
              </div>
              
              <p className="text-xs text-gray-500">
                Add custom attributes that can be used in questions with {`{{loop.attribute_name}}`} variables.
              </p>

              {customAttributes.length === 0 ? (
                <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <p className="text-sm text-gray-500 mb-2">No custom attributes added yet</p>
                  <button
                    type="button"
                    onClick={addCustomAttribute}
                    className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 border border-purple-200 rounded hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Add First Attribute
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {customAttributes.map((attr, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={attr.key}
                          onChange={(e) => handleCustomAttributeChange(index, 'key', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                          placeholder="Attribute name (e.g., price, rating)"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={attr.value}
                          onChange={(e) => handleCustomAttributeChange(index, 'value', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                          placeholder="Value (e.g., $999, 4.8/5)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomAttribute(index)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove attribute"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Example Usage */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Example Usage</h4>
              <div className="space-y-2 text-xs text-blue-800">
                <div>
                  <strong>Basic:</strong> "How satisfied are you with {`{{loop.label}}`}?"
                </div>
                {customAttributes.some(attr => attr.key && attr.value) && (
                  <div>
                    <strong>With Attributes:</strong> "The {`{{loop.label}}`} costs {`{{loop.price}}`} and has a {`{{loop.rating}}`} rating. Is this price reasonable?"
                  </div>
                )}
                <div className="text-blue-600 mt-2">
                  Available variables: <code className="bg-white px-1 rounded">{`{{loop.key}}`}</code>, <code className="bg-white px-1 rounded">{`{{loop.label}}`}</code>
                  {customAttributes.filter(attr => attr.key).map(attr => (
                    <span key={attr.key}>, <code className="bg-white px-1 rounded">{`{{loop.${attr.key}}}`}</code></span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Item' : 'Create Item')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
