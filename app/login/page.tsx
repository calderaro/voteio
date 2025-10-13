"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

type ErrorInfo = {
  message: string;
  hints: string[];
  rawMessage?: string;
};

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const router = useRouter();

  const buildErrorDetails = useMemo(
    () =>
      function buildErrorDetails(rawMessage?: string): ErrorInfo {
        const normalized = rawMessage?.toLowerCase() ?? "";
        const hints = new Set<string>();

        if (
          normalized.includes("credential") ||
          normalized.includes("password") ||
          normalized.includes("invalid")
        ) {
          hints.add("Double-check the email and password you entered.");
          hints.add("If you recently reset your password, use the newest one.");
        }

        if (normalized.includes("rate") || normalized.includes("attempt")) {
          hints.add("Too many attempts can trigger a temporary lockout. Wait a minute before trying again.");
        }

        if (normalized.includes("user") && normalized.includes("not")) {
          hints.add("Ask an administrator to confirm that your account exists and is active.");
        }

        if (hints.size === 0) {
          hints.add("Double-check your credentials and try again.");
          hints.add("If the problem persists, contact an administrator for help.");
        }

        let friendlyMessage = "We couldn’t sign you in.";
        if (normalized.includes("invalid")) {
          friendlyMessage = "Those credentials didn’t match our records.";
        } else if (normalized.includes("password")) {
          friendlyMessage = "The password you entered looks incorrect.";
        } else if (normalized.includes("email")) {
          friendlyMessage = "We had trouble with that email address.";
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
      const result = await authClient.signIn.email({
        email,
        password,
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
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your admin account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
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
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
