"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

type SearchResult = {
  id: string;
  originalUrl: string;
  title: string;
  score?: number;
  createdAt?: string;
};

export default function Home() {
  const [linkUrl, setLinkUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showingAllLinks, setShowingAllLinks] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const storedUserId = localStorage.getItem("userId");
    const storedUserEmail = localStorage.getItem("userEmail");

    if (!storedUserId) {
      router.push("/auth");
    } else {
      setUserId(storedUserId);
      setUserEmail(storedUserEmail);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("accessToken");
    router.push("/auth");
  };

  const handleSave = async () => {
    const input = linkUrl.trim();
    if (!input) {
      setSaveStatus("Please paste a link first.");
      return;
    }

    if (!userId) {
      setSaveStatus("Please log in first.");
      return;
    }

    setSaveLoading(true);
    setSaveStatus(null);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setSaveStatus("Please log in first.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ originalUrl: input }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save link.");
      }

      setSaveStatus("Link saved. Embedding is being generated.");
      setLinkUrl("");
    } catch (error) {
      setSaveStatus(
        error instanceof Error ? error.message : "Failed to save link.",
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSearch = async () => {
    const input = searchQuery.trim();
    if (!input) {
      setSearchStatus("Enter a search query.");
      return;
    }

    if (!userId) {
      setSearchStatus("Please log in first.");
      return;
    }

    setSearchLoading(true);
    setSearchStatus(null);
    setShowingAllLinks(false);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setSearchStatus("Please log in first.");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/links/search?q=${encodeURIComponent(input)}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Search failed.");
      }

      const data = (await response.json()) as SearchResult[];
      setResults(data);
      if (data.length === 0) {
        setSearchStatus("No results found.");
      }
    } catch (error) {
      setSearchStatus(
        error instanceof Error ? error.message : "Search failed.",
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleViewAll = async () => {
    if (!userId) {
      setSearchStatus("Please log in first.");
      return;
    }

    setSearchLoading(true);
    setSearchStatus(null);
    setShowingAllLinks(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setSearchStatus("Please log in first.");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/links`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to fetch links.");
      }

      const data = (await response.json()) as SearchResult[];
      setResults(data);
      if (data.length === 0) {
        setSearchStatus("No links saved yet.");
      }
    } catch (error) {
      setSearchStatus(
        error instanceof Error ? error.message : "Failed to fetch links.",
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBackToSearch = () => {
    setShowingAllLinks(false);
    setResults([]);
    setSearchStatus(null);
    setSearchQuery("");
  };

  // Don't render the page until we've checked authentication
  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-12">
        <header className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              Semantic Recall
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={showingAllLinks ? handleBackToSearch : handleViewAll}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                {showingAllLinks ? "Main Page" : "View All"}
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
              >
                Logout
              </button>
            </div>
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-slate-900">
            Build a memory of everything you read.
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Save links and search by meaning.
          </p>
        </header>

        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Paste a link
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://example.com/article"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saveLoading}
                className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saveLoading ? "Saving..." : "Save"}
              </button>
            </div>
            {saveStatus && (
              <p className="text-sm text-slate-600">{saveStatus}</p>
            )}
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              {showingAllLinks ? "All saved links" : "Search your recall"}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Type a concept or memory..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searchLoading}
                className="rounded-2xl border border-slate-900 px-6 py-3 text-sm font-medium text-slate-900 transition disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </div>
            {searchStatus && (
              <p className="text-sm text-slate-600">{searchStatus}</p>
            )}
          </div>

          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {result.title || result.originalUrl}
                  </p>
                  <a
                    href={result.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-600 underline decoration-slate-300 underline-offset-4"
                  >
                    {result.originalUrl}
                  </a>
                </div>
                {showingAllLinks && result.createdAt && (
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Saved: {new Date(result.createdAt).toLocaleDateString()}
                  </p>
                )}
                {!showingAllLinks && result.score !== undefined && (
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Similarity score: {result.score.toFixed(4)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
