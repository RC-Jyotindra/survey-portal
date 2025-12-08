"use client";

import { useState, useEffect } from 'react';
import { LoopBattery } from './types';
import { config } from '@/lib/config';
import { getApiHeaders } from '@/lib/api-headers';

interface DatasetItem {
  id: string;
  batteryId: string;
  key: string;
  attributes: Record<string, any>;
  isActive: boolean;
  sortIndex?: number;
}

interface DatasetManagementPanelProps {
  surveyId: string;
  loopBatteries: LoopBattery[];
  onDatasetUpdated?: () => void;
}

export default function DatasetManagementPanel({
  surveyId,
  loopBatteries,
  onDatasetUpdated
}: DatasetManagementPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedBattery, setSelectedBattery] = useState<LoopBattery | null>(null);
  const [datasetItems, setDatasetItems] = useState<DatasetItem[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DatasetItem | null>(null);
  const [loading, setLoading] = useState(false);

  // Load dataset items when battery is selected
  useEffect(() => {
    if (selectedBattery) {
      loadDatasetItems(selectedBattery.id);
    }
  }, [selectedBattery, surveyId]);

  const loadDatasetItems = async (batteryId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/loop-batteries/${batteryId}/dataset-items`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setDatasetItems(data.datasetItems || []);
      }
    } catch (error) {
      console.error('Error loading dataset items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = () => {
    setEditingItem(null);
    setIsCreateModalOpen(true);
  };

  const handleEditItem = (item: DatasetItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedBattery) return;
    
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/loop-batteries/${selectedBattery.id}/dataset-items/${itemId}`, {
        method: 'DELETE',
        headers: getApiHeaders()
      });

      if (response.ok) {
        setDatasetItems(prev => prev.filter(item => item.id !== itemId));
        onDatasetUpdated?.();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete dataset item');
      }
    } catch (error) {
      console.error('Error deleting dataset item:', error);
      alert('Failed to delete dataset item. Please try again.');
    }
  };

  const handleItemCreated = (newItem: DatasetItem) => {
    setDatasetItems(prev => [...prev, newItem]);
    setIsCreateModalOpen(false);
    onDatasetUpdated?.();
  };

  const handleItemUpdated = (updatedItem: DatasetItem) => {
    setDatasetItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    setIsEditModalOpen(false);
    onDatasetUpdated?.();
  };

  // Get all unique attribute keys from dataset items
  const getAllAttributeKeys = (): string[] => {
    const keys = new Set<string>();
    datasetItems.forEach(item => {
      Object.keys(item.attributes || {}).forEach(key => keys.add(key));
    });
    return Array.from(keys).sort();
  };

  const attributeKeys = getAllAttributeKeys();

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-2"
      >
        <span className="text-sm font-medium text-gray-900">📊 Dataset Management</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="space-y-3 mt-3">
          {/* Battery Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Select Loop Battery
            </label>
            <select
              value={selectedBattery?.id || ''}
              onChange={(e) => {
                const battery = loopBatteries.find(b => b.id === e.target.value);
                setSelectedBattery(battery || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
            >
              <option value="">Select a loop battery</option>
              {loopBatteries.map(battery => (
                <option key={battery.id} value={battery.id}>
                  {battery.name} (Pages {battery.startPage.index}-{battery.endPage.index})
                </option>
              ))}
            </select>
          </div>

          {selectedBattery && (
            <div className="space-y-3">
              {/* Dataset Info */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="text-sm font-medium text-purple-900 mb-2">
                  Dataset for "{selectedBattery.name}"
                </h4>
                <p className="text-xs text-purple-700 mb-2">
                  This dataset will be used when the loop runs. Each item represents one iteration.
                </p>
                <div className="text-xs text-purple-600">
                  <div>• Use <code className="bg-white px-1 rounded">{`{{loop.key}}`}</code> for the item key</div>
                  <div>• Use <code className="bg-white px-1 rounded">{`{{loop.label}}`}</code> for the item label</div>
                  <div>• Use <code className="bg-white px-1 rounded">{`{{loop.attribute_name}}`}</code> for custom attributes</div>
                </div>
              </div>

              {/* Dataset Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">Dataset Items</h4>
                    <button
                      onClick={handleCreateItem}
                      className="px-3 py-1 text-xs font-medium text-white bg-purple-600 border border-transparent rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                ) : datasetItems.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">No dataset items created yet</p>
                    <button
                      onClick={handleCreateItem}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                      Create First Item
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Key
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Label
                          </th>
                          {attributeKeys.map(key => (
                            <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                              {key}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {datasetItems.map((item, index) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <code className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                                {item.key}
                              </code>
                            </td>
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {item.attributes?.label || item.key}
                            </td>
                            {attributeKeys.map(key => (
                              <td key={key} className="px-3 py-2 text-gray-600">
                                {item.attributes?.[key] || '-'}
                              </td>
                            ))}
                            <td className="px-3 py-2">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                                  title="Edit item"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Delete item"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Example Usage */}
              {datasetItems.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">Example Usage in Questions</h4>
                  <div className="space-y-2 text-xs">
                    <div className="text-blue-800">
                      <strong>Question Text:</strong> "How satisfied are you with {`{{loop.label}}`}?"
                    </div>
                    <div className="text-blue-800">
                      <strong>With Attributes:</strong> "The {`{{loop.label}}`} costs {`{{loop.price}}`} and has a {`{{loop.rating}}`} rating. Is this price reasonable?"
                    </div>
                    <div className="text-blue-600 mt-2">
                      Available variables: <code className="bg-white px-1 rounded">{`{{loop.key}}`}</code>, <code className="bg-white px-1 rounded">{`{{loop.label}}`}</code>
                      {attributeKeys.map(key => (
                        <span key={key}>, <code className="bg-white px-1 rounded">{`{{loop.${key}}}`}</code></span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dataset Item Modals */}
      {isCreateModalOpen && selectedBattery && (
        <DatasetItemModal
          surveyId={surveyId}
          batteryId={selectedBattery.id}
          onItemCreated={handleItemCreated}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {isEditModalOpen && editingItem && selectedBattery && (
        <DatasetItemModal
          surveyId={surveyId}
          batteryId={selectedBattery.id}
          editingItem={editingItem}
          onItemUpdated={handleItemUpdated}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}

// Import the modal component (we'll create this next)
import DatasetItemModal from './dataset-item-modal';