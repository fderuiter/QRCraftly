import React from 'react';

/**
 * 404 Error Page Component
 *
 * Renders a user-friendly error message when a requested page is not found.
 * Provides a link to navigate back to the home page.
 *
 * @returns {JSX.Element} The error page layout.
 */
export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-700">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="mb-8">The page you are looking for does not exist.</p>
      <a href="/" className="px-4 py-2 bg-teal-700 text-white rounded hover:bg-teal-800 transition-colors">
        Go Home
      </a>
    </div>
  );
}
