'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';

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

interface Invite {
  id: string;
  token: string;
  email?: string;
  externalId?: string;
  url: string;
  expiresAt?: Date;
  consumedAt?: Date;
  status: string;
  createdAt: Date;
}

interface InviteStats {
  total: number;
  active: number;
  used: number;
  expired: number;
  usageRate: number;
}

interface InvitesModalProps {
  collector: Collector;
  onClose: () => void;
}

export default function InvitesModal({ collector, onClose }: InvitesModalProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    emails: '',
    count: '',
    ttlHours: '168' // 7 days
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadInvites();
    loadStats();
  }, [collector.id]);

  const loadInvites = async () => {
    try {
      setLoading(true);
      setError(null);

      const data: Invite[] = await api.get(`/api/authoring/collectors/${collector.id}/invites`);
      setInvites(data);
      
    } catch (err) {
      console.error('Failed to load invites:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data: InviteStats = await api.get(`/api/authoring/collectors/${collector.id}/invites/stats`);
      setStats(data);
    } catch (err) {
      console.error('Failed to load invite stats:', err);
    }
  };

  const handleCreateInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setCreating(true);
      setError(null);

      const emails = createForm.emails
        .split('\n')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      const requestData: any = {
        ttlHours: parseInt(createForm.ttlHours)
      };

      if (emails.length > 0) {
        requestData.emails = emails;
      }

      if (createForm.count) {
        requestData.count = parseInt(createForm.count);
      }

      await api.post(`/api/authoring/collectors/${collector.id}/invites`, requestData);

      // Reload invites and stats
      await Promise.all([loadInvites(), loadStats()]);
      
      // Reset form
      setCreateForm({ emails: '', count: '', ttlHours: '168' });
      setShowCreateForm(false);
      
    } catch (err) {
      console.error('Failed to create invites:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invites');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invite?')) {
      return;
    }

    try {
      await api.post(`/api/authoring/invites/${inviteId}/revoke`);

      // Reload invites and stats
      await Promise.all([loadInvites(), loadStats()]);
      
    } catch (err) {
      console.error('Failed to revoke invite:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke invite');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const exportInvites = async () => {
    try {
      const csvContent = await api.get(`/api/authoring/collectors/${collector.id}/invites/export`, {
        headers: {
          'Accept': 'text/csv'
        }
      }) as string;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invites-${collector.slug}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Failed to export invites:', err);
      setError(err instanceof Error ? err.message : 'Failed to export invites');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Invites</h2>
              <p className="text-gray-600 mt-1">{collector.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Invites</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.used}</div>
                <div className="text-sm text-gray-600">Used</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
                <div className="text-sm text-gray-600">Expired</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Invites</span>
              </button>
              
              <button
                onClick={exportInvites}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Invites</h3>
              <form onSubmit={handleCreateInvites} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Addresses (one per line)
                  </label>
                  <textarea
                    value={createForm.emails}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, emails: e.target.value }))}
                    placeholder="user1@example.com&#10;user2@example.com"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Random Invites
                    </label>
                    <input
                      type="number"
                      value={createForm.count}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, count: e.target.value }))}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expires In (hours)
                    </label>
                    <input
                      type="number"
                      value={createForm.ttlHours}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, ttlHours: e.target.value }))}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {creating && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>{creating ? 'Creating...' : 'Create Invites'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Invites List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {invites.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No invites created yet</p>
                </div>
              ) : (
                invites.map((invite) => (
                  <div key={invite.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invite.status)}`}>
                            {invite.status}
                          </span>
                          {invite.email && (
                            <span className="text-sm text-gray-600">{invite.email}</span>
                          )}
                          {invite.externalId && (
                            <span className="text-sm text-gray-600">ID: {invite.externalId}</span>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Created: {formatDate(invite.createdAt)}</div>
                          {invite.expiresAt && (
                            <div>Expires: {formatDate(invite.expiresAt)}</div>
                          )}
                          {invite.consumedAt && (
                            <div>Used: {formatDate(invite.consumedAt)}</div>
                          )}
                        </div>
                        
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-mono text-gray-900">
                          {invite.url}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => copyToClipboard(invite.url)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy link"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        
                        {invite.status === 'active' && (
                          <button
                            onClick={() => handleRevokeInvite(invite.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Revoke invite"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
