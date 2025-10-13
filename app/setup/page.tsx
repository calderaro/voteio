"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

type ErrorInfo = {
  message: string;
  hints: string[];
  rawMessage?: string;
};

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const router = useRouter();

  const buildErrorDetails = useMemo(
    () =>
      function buildErrorDetails(rawMessage?: string): ErrorInfo {
        const normalized = rawMessage?.toLowerCase() ?? "";
        const hints = new Set<string>();

        if (normalized.includes("already")) {
          hints.add("It looks like an admin already exists. Head to the login page and sign in instead.");
        }

        if (normalized.includes("password")) {
          hints.add("Use a password with at least 12 characters, mixing letters, numbers, and symbols.");
        }

        if (normalized.includes("email")) {
          hints.add("Confirm the email address is valid and not already in use.");
        }

        if (hints.size === 0) {
          hints.add("Review the form fields and try again.");
          hints.add("If the problem continues, remove any existing admin account in the database or contact support.");
        }

        let friendlyMessage = "We couldn’t create the admin account.";
        if (normalized.includes("already")) {
          friendlyMessage = "An admin account already exists for this project.";
        } else if (normalized.includes("password")) {
          friendlyMessage = "The password doesn’t meet the security requirements.";
        } else if (normalized.includes("email")) {
          friendlyMessage = "There’s a problem with that email address.";
        } else if (rawMessage?.trim()) {
          friendlyMessage = rawMessage.trim();
        }

        return {
          message: friendlyMessage,
          hints: Array.from(hints),
          rawMessage: rawMessage?.trim(),
        };
      },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(buildErrorDetails(result.error.message));
      } else {
        router.push("/admin");
      }
    } catch (err) {
      const fallbackMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(buildErrorDetails(fallbackMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Setup Admin Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create the first admin account for your voting app
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">{error.message}</p>
              {error.hints.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {error.hints.map((hint, index) => (
                    <li key={index}>{hint}</li>
                  ))}
                </ul>
              )}
              {error.rawMessage && error.rawMessage !== error.message && (
                <p className="mt-2 text-xs text-red-600/80">
                  Technical details: {error.rawMessage}
                </p>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? "Creating Account..." : "Create Admin Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
