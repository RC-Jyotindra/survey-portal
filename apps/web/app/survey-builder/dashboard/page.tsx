"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { surveyApi, Survey } from "../../../lib/api/survey-api";
import Header from "@/components/navigation/header";
import { useAuth } from "../../../contexts/AuthContext";
import { useTenant } from "../../../contexts/TenantContext";

type TokenPayload = {
  sub: string; // userId
  tenant_id: string;
  products: { code: "SB" | "PM" | "PMM"; role: AssignmentRole }[];
  exp?: number;
};

type AssignmentRole = "OWNER" | "ADMIN" | "MANAGER" | "EDITOR" | "USER" | "VIEWER";

const PRODUCT_CODE = "SB"; // Survey Builder

const roleRank: Record<AssignmentRole, number> = {
  OWNER: 6,
  ADMIN: 5,
  MANAGER: 4,
  EDITOR: 3,
  USER: 2,
  VIEWER: 1,
};

function hasAtLeast(role: AssignmentRole | undefined, needed: AssignmentRole) {
  if (!role) return false;
  return roleRank[role] >= roleRank[needed];
}

function SurveyList({ sbRole }: { sbRole?: AssignmentRole }) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canEdit = hasAtLeast(sbRole, "EDITOR");
  const canDelete = hasAtLeast(sbRole, "MANAGER");
  const canPublish = hasAtLeast(sbRole, "MANAGER");

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const response = await surveyApi.getSurveys({ limit: 10 });
      setSurveys(response.surveys);
    } catch (err: any) {
      setError(err.message || "Failed to load surveys");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (surveyId: string) => {
    if (!confirm("Are you sure you want to delete this survey? This action cannot be undone.")) {
      return;
    }

    try {
      await surveyApi.deleteSurvey(surveyId);
      setSurveys(prev => prev.filter(s => s.id !== surveyId));
    } catch (err: any) {
      alert(err.message || "Failed to delete survey");
    }
  };

  const handlePublish = async (surveyId: string) => {
    try {
      const response = await surveyApi.publishSurvey(surveyId);
      setSurveys(prev => prev.map(s => 
        s.id === surveyId ? response.survey : s
      ));
    } catch (err: any) {
      alert(err.message || "Failed to publish survey");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: "bg-yellow-100 text-yellow-800",
      PUBLISHED: "bg-green-100 text-green-800",
      CLOSED: "bg-gray-100 text-gray-800",
      ARCHIVED: "bg-red-100 text-red-800"
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-500">Loading surveys...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (surveys.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-500 mb-4">No surveys found</div>
        {canEdit && (
          <Link
            href="/survey-builder/create"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Create your first survey →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Survey
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Questions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Responses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {surveys.map((survey) => (
              <tr key={survey.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      <Link 
                        href={`/survey-builder/edit/${survey.id}`}
                        className="hover:text-blue-600"
                      >
                        {survey.title}
                      </Link>
                    </div>
                    {survey.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {survey.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(survey.status)}`}>
                    {survey.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {survey._count?.questions || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {survey._count?.sessions || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(survey.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end space-x-3">
                    {canEdit && (
                      <Link
                        href={`/survey-builder/edit/${survey.id}`}
                        className="group relative p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                        title="Edit Survey"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                          Edit Survey
                        </div>
                      </Link>
                    )}
                    {canPublish && survey.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(survey.id)}
                        className="group relative p-2 text-gray-400 hover:text-green-600 transition-colors duration-200"
                        title="Publish Survey"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                          Publish Survey
                        </div>
                      </button>
                    )}
                    {canDelete && survey.status === 'DRAFT' && (
                      <button
                        onClick={() => handleDelete(survey.id)}
                        className="group relative p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                        title="Delete Survey"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                          Delete Survey
                        </div>
                      </button>
                    )}
                    {/* Additional Actions */}
                    <button
                      className="group relative p-2 text-gray-400 hover:text-purple-600 transition-colors duration-200"
                      title="Duplicate Survey"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <div className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                        Duplicate Survey
                      </div>
                    </button>
                    <button
                      className="group relative p-2 text-gray-400 hover:text-indigo-600 transition-colors duration-200"
                      title="View Analytics"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <div className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                        View Analytics
                      </div>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { user, products, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { tenant, tenantId, isLoading: tenantLoading } = useTenant();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<TokenPayload | null>(null);
  const [error, setError] = useState<string>("");

  const API_BASE = process.env.NEXT_PUBLIC_AUTH_API || "http://localhost:3001";

  useEffect(() => {
    // Wait for auth and tenant context to load
    if (authLoading || tenantLoading) {
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push("/survey-builder");
      return;
    }

    // Check if user has access to Survey Builder
    const sb = products?.find((p: any) => p.code === PRODUCT_CODE);
    if (!sb) {
      setError("No access to Survey Builder for this tenant");
      setLoading(false);
      return;
    }

    // Set claims for role checking
    setClaims({
      sub: user?.id || '',
      tenant_id: tenantId || '',
      products: products || []
    } as TokenPayload);

    setLoading(false);
  }, [authLoading, tenantLoading, isAuthenticated, user, tenantId, router]);

  const sbRole = claims?.products.find((p) => p.code === PRODUCT_CODE)?.role;
  const canCreate = hasAtLeast(sbRole, "EDITOR");

  const handleLogout = () => {
    logout();
    router.push("/survey-builder");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <Header />

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to Survey Builder</h2>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Your Organization</h3>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Your SB Role
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {claims?.tenant_id || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                        {sbRole || "—"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Product chips for this tenant */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-3">Your Products</h3>
            <div className="flex flex-wrap gap-2">
              {claims?.products?.map((p) => (
                <span
                  key={p.code}
                  className="inline-flex items-center rounded-md bg-gray-900 px-3 py-1 text-sm text-white border"
                  title={`Role: ${p.role}`}
                >
                  {p.code === "SB" ? "Survey Builder" : p.code === "PM" ? "Project Management" : "Panel Management"} · {p.role}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Your Surveys</h3>
              {canCreate ? (
                <Link
                  href="/survey-builder/create"
                  className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Survey
                </Link>
              ) : (
                <span className="text-sm text-gray-500">
                  You need <strong>EDITOR</strong> or higher to create surveys.
                </span>
              )}
            </div>
            <SurveyList sbRole={sbRole} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-medium text-blue-800">Question Library</h3>
              </div>
              <p className="text-blue-600 mb-4">Access pre-built questions and templates</p>
              <Link href="/survey-builder/question-library"
                className="inline-flex items-center text-blue-700 hover:text-blue-900 text-sm font-medium transition-colors duration-200">
                Browse Library
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border border-green-100 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="font-medium text-green-800">Survey Templates</h3>
              </div>
              <p className="text-green-600 mb-4">Start with pre-built survey templates</p>
              <Link href="/survey-builder/templates"
                className="inline-flex items-center text-green-700 hover:text-green-900 text-sm font-medium transition-colors duration-200">
                View Templates
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg border border-purple-100 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-medium text-purple-800">Analytics</h3>
              </div>
              <p className="text-purple-600 mb-4">View survey performance metrics</p>
              <Link href="/survey-builder/analytics"
                className="inline-flex items-center text-purple-700 hover:text-purple-900 text-sm font-medium transition-colors duration-200">
                View Analytics
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Logic Demo Feature */}
          <div className="mt-8">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border border-blue-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white text-xl">🎮</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">🆕 Logic Features Demo</h3>
                    <p className="text-gray-600 text-sm">Try out conditional logic, jump logic, randomization, and carry forward features in an interactive preview!</p>
                  </div>
                </div>
                <Link 
                  href="/survey-builder/preview/demo-logic"
                  className="inline-flex items-center bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105"
                >
                  Try Demo
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Optional quick links to other portals if user has them */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Other portals you can access</h3>
              <button className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Get Access
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Panel Management</h4>
                      <p className="text-sm text-gray-600">Manage survey panels and participants</p>
                    </div>
                  </div>
                  {claims?.products?.some((p) => p.code === "PMM") ? (
                    <Link 
                      href="/panel-management/dashboard"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                    >
                      Access
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-400">No access</span>
                  )}
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Project Management</h4>
                      <p className="text-sm text-gray-600">Manage research projects and workflows</p>
                    </div>
                  </div>
                  {claims?.products?.some((p) => p.code === "PM") ? (
                    <Link 
                      href="/project-management/dashboard"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                    >
                      Access
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-400">No access</span>
                  )}
                </div>
              </div>
            </div>
            
            {!claims?.products?.some((p) => p.code !== "SB") && (
              <div className="mt-4 text-center text-gray-500 text-sm">
                You currently only have access to Survey Builder. Contact your administrator to get access to additional products.
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
