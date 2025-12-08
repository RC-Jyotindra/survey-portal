'use client';

import { useState, useEffect } from 'react';
import CollectorsList from './CollectorsList';
import CreateCollectorModal from './CreateCollectorModal';
import InvitesModal from './InvitesModal';

interface Collector {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  publicUrl: string;
  opensAt?: Date;
  closesAt?: Date;
  maxResponses?: number;
  allowMultiplePerDevice: boolean;
  allowTest: boolean;
  createdAt: Date;
}

interface DistributeTabProps {
  surveyId: string;
}

export default function DistributeTab({ surveyId }: DistributeTabProps) {
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);
  const [selectedCollector, setSelectedCollector] = useState<Collector | null>(null);

  useEffect(() => {
    loadCollectors();
  }, [surveyId]);

  const loadCollectors = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with real API call once authentication is set up
      // In production, this would be:
      // const response = await fetch(`/api/authoring/surveys/${surveyId}/collectors`);
      
      // Mock data for testing - REMOVE IN PRODUCTION
      setTimeout(() => {
        setCollectors([
          {
            id: 'mock-collector-1',
            name: 'Customer Feedback Survey',
            slug: 'customer-feedback',
            type: 'PUBLIC',
            status: 'active',
            publicUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/c/customer-feedback`,
            allowMultiplePerDevice: true,
            allowTest: true,
            createdAt: new Date()
          }
        ]);
        setLoading(false);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to load collectors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load collectors');
      setLoading(false);
    }
  };

  const handleCreateCollector = async (collectorData: any) => {
    try {
      // Basic validation
      if (!collectorData.name || collectorData.name.trim().length === 0) {
        throw new Error('Collector name is required');
      }

      if (!collectorData.type) {
        throw new Error('Collector type is required');
      }

      // Validate date ranges if both are provided
      if (collectorData.opensAt && collectorData.closesAt && 
          new Date(collectorData.opensAt) >= new Date(collectorData.closesAt)) {
        throw new Error('Open date must be before close date');
      }

      // TODO: Replace with real API call once authentication is set up
      // Mock creation - REMOVE IN PRODUCTION
      const newCollector: Collector = {
        id: `mock-collector-${Date.now()}`,
        name: collectorData.name,
        slug: collectorData.slug || collectorData.name.toLowerCase().replace(/\s+/g, '-'),
        type: collectorData.type,
        status: 'active',
        publicUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/c/${collectorData.slug || collectorData.name.toLowerCase().replace(/\s+/g, '-')}`,
        opensAt: collectorData.opensAt,
        closesAt: collectorData.closesAt,
        maxResponses: collectorData.maxResponses,
        allowMultiplePerDevice: collectorData.allowMultiplePerDevice,
        allowTest: collectorData.allowTest,
        createdAt: new Date()
      };

      setCollectors(prev => [newCollector, ...prev]);
      setShowCreateModal(false);
      
    } catch (err) {
      console.error('Failed to create collector:', err);
      setError(err instanceof Error ? err.message : 'Failed to create collector');
    }
  };

  const handleDeleteCollector = async (collectorId: string) => {
    if (!confirm('Are you sure you want to delete this collector? This action cannot be undone.')) {
      return;
    }

    try {
      // TODO: Replace with real API call once authentication is set up
      // Mock deletion - REMOVE IN PRODUCTION
      setCollectors(prev => prev.filter(c => c.id !== collectorId));
      
    } catch (err) {
      console.error('Failed to delete collector:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete collector');
    }
  };

  const handleOpenInvites = (collector: Collector) => {
    setSelectedCollector(collector);
    setShowInvitesModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Distribute Survey</h2>
          <p className="text-gray-600 mt-1">
            Create and manage survey links to collect responses
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Link</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Collectors List */}
      {collectors.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No survey links yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first survey link to start collecting responses
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Your First Link
          </button>
        </div>
      ) : (
        <CollectorsList
          collectors={collectors}
          surveyId={surveyId}
          onDelete={handleDeleteCollector}
          onOpenInvites={handleOpenInvites}
        />
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateCollectorModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCollector}
        />
      )}

      {showInvitesModal && selectedCollector && (
        <InvitesModal
          collector={selectedCollector}
          onClose={() => {
            setShowInvitesModal(false);
            setSelectedCollector(null);
          }}
        />
      )}
    </div>
  );
}
