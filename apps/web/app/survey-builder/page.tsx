"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRODUCT_CODE = "SB"; // This page is the Survey Builder portal

type AvailableOption = {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  products: {
    code: string;
    name: string;
    role: string;
  }[];
};

export default function SurveyBuilderAuth() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<"credentials" | "selection" | "verification">("credentials");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    tenantName: "",
    tenantSlug: "",
  });
  const [availableOptions, setAvailableOptions] = useState<AvailableOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<{tenantId: string; productCode: string} | null>(null);
  const [verificationData, setVerificationData] = useState({
    intentId: "",
    otpCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = process.env.NEXT_PUBLIC_AUTH_API || "http://localhost:3001";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        // Step 1: Verify credentials
        const res = await fetch(`${API_BASE}/auth/verify-credentials`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request failed");

        if (data.autoLogin) {
          // Auto-login case: user has only one option
          await completeLogin(data);
        } else {
          // Show selection screen
          setAvailableOptions(data.availableOptions);
          setStep("selection");
        }
      } else {
        // Registration flow - Step 1: Initiate signup
        const res = await fetch(`${API_BASE}/auth/register/initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
            name: formData.name.trim(),
            tenantName: formData.tenantName.trim(),
            tenantSlug: formData.tenantSlug.trim(),
            productCode: PRODUCT_CODE,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request failed");

        // Store intent ID and show verification step
        setVerificationData(prev => ({ ...prev, intentId: data.intentId }));
        setStep("verification");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionSubmit = async () => {
    if (!selectedOption) {
      setError("Please select an organization and product");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/complete-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          tenantId: selectedOption.tenantId,
          productCode: selectedOption.productCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      await completeLogin(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = async (data: any) => {
    // Store auth data
    localStorage.setItem("authToken", data.token);
    localStorage.setItem("activeTenantId", data.tenant?.id || "");
    localStorage.setItem("products", JSON.stringify(data.products || []));
    localStorage.setItem("user", JSON.stringify(data.user || {}));
    localStorage.setItem("tenant", JSON.stringify(data.tenant || {}));

    // Navigate to dashboard
    router.push("/survey-builder/dashboard");
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/register/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intentId: verificationData.intentId,
          code: verificationData.otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      await completeLogin(data);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resetToCredentials = () => {
    setStep("credentials");
    setAvailableOptions([]);
    setSelectedOption(null);
    setVerificationData({ intentId: "", otpCode: "" });
    setError("");
  };

  if (step === "verification") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
              <p className="text-gray-600">We've sent a 6-digit code to {formData.email}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleVerificationSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationData.otpCode}
                  onChange={(e) => setVerificationData(prev => ({ ...prev, otpCode: e.target.value }))}
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
                  placeholder="000000"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code from your email</p>
              </div>

              <button
                type="submit"
                disabled={loading || verificationData.otpCode.length !== 6}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={resetToCredentials}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Back to Registration
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "selection") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Organization</h2>
              <p className="text-gray-600">Select which organization and product you'd like to access</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              {availableOptions.map((option) => (
                <div key={option.tenant.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{option.tenant.name}</h3>
                  <div className="space-y-2">
                    {option.products.map((product) => (
                      <label
                        key={`${option.tenant.id}-${product.code}`}
                        className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${
                          selectedOption?.tenantId === option.tenant.id && selectedOption?.productCode === product.code
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="selection"
                          value={`${option.tenant.id}-${product.code}`}
                          checked={selectedOption?.tenantId === option.tenant.id && selectedOption?.productCode === product.code}
                          onChange={() => setSelectedOption({ tenantId: option.tenant.id, productCode: product.code })}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">Role: {product.role}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSelectionSubmit}
                disabled={!selectedOption || loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Continue"}
              </button>
              
              <button
                onClick={resetToCredentials}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-8">
            {isLogin ? "Login to Survey Builder" : "Register for Survey Builder"}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleCredentialsSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Only show tenant slug for registration now */}
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization URL Slug
                  </label>
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-1">yourapp.com/</span>
                    <input
                      type="text"
                      name="tenantSlug"
                      value={formData.tenantSlug}
                      onChange={handleChange}
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="your-org-name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    name="tenantName"
                    value={formData.tenantName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : isLogin ? "Continue" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {isLogin ? "Need an account? Register" : "Already have an account? Login"}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <Link href="/" className="text-gray-600 hover:text-gray-800 text-sm">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
