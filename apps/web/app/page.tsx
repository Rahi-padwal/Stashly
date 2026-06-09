"use client";

import { useState, useEffect, useRef } from "react";
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

type Collection = {
  id: string;
  name: string;
  createdAt: string;
  linkCount: number;
};

const CARD_COLORS = [
  "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
  "bg-violet-50 border-violet-200 hover:bg-violet-100",
  "bg-sky-50 border-sky-200 hover:bg-sky-100",
  "bg-teal-50 border-teal-200 hover:bg-teal-100",
  "bg-rose-50 border-rose-200 hover:bg-rose-100",
  "bg-amber-50 border-amber-200 hover:bg-amber-100",
  "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
  "bg-pink-50 border-pink-200 hover:bg-pink-100",
];

function CollectionCard({
  col,
  index,
  onDelete,
  onClick,
}: {
  col: Collection;
  index: number;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}) {
  const color = CARD_COLORS[index % CARD_COLORS.length];
  return (
    <div
      className={`group relative cursor-pointer rounded-2xl border p-5 transition ${color}`}
      onClick={() => onClick(col.id)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(col.id);
        }}
        className="absolute right-3 top-3 hidden h-6 w-6 items-center justify-center rounded-full bg-white/70 text-slate-400 hover:bg-white hover:text-red-500 group-hover:flex"
        title="Delete collection"
      >
        ×
      </button>
      <div className="mb-3 text-2xl">📁</div>
      <p className="font-semibold text-slate-800">{col.name}</p>
      <p className="mt-1 text-xs text-slate-500">
        {col.linkCount} {col.linkCount === 1 ? "link" : "links"}
      </p>
    </div>
  );
}

function AddToCollectionMenu({
  linkId,
  collections,
  onAdd,
  onClose,
}: {
  linkId: string;
  collections: Collection[];
  onAdd: (collectionId: string, linkId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  if (collections.length === 0) {
    return (
      <div
        ref={ref}
        className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
      >
        <p className="text-xs text-slate-400">No collections yet. Create one first.</p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-9 z-20 w-52 rounded-xl border border-slate-200 bg-white shadow-lg"
    >
      <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Add to collection
      </p>
      <div className="max-h-48 overflow-y-auto py-1">
        {collections.map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => {
              onAdd(col.id, linkId);
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <span>📁</span>
            <span className="truncate">{col.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [linkUrl, setLinkUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
  const [showDeletedPopup, setShowDeletedPopup] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showingAllLinks, setShowingAllLinks] = useState(false);

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newColName, setNewColName] = useState("");
  const [creatingCol, setCreatingCol] = useState(false);
  const [showNewColInput, setShowNewColInput] = useState(false);
  const [openMenuLinkId, setOpenMenuLinkId] = useState<string | null>(null);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (!storedUserId) {
      router.push("/auth");
    } else {
      setUserId(storedUserId);
    }
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    void fetchCollections();
  }, [userId]);

  useEffect(() => {
    if (!showDeletedPopup) return;
    const id = window.setTimeout(() => setShowDeletedPopup(false), 1800);
    return () => window.clearTimeout(id);
  }, [showDeletedPopup]);

  useEffect(() => {
    if (!addedToast) return;
    const id = window.setTimeout(() => setAddedToast(null), 2000);
    return () => window.clearTimeout(id);
  }, [addedToast]);

  const getToken = () => localStorage.getItem("accessToken");

  const fetchCollections = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/collections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCollections((await res.json()) as Collection[]);
    } catch {
      // collections endpoint not available (backend not yet deployed)
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("accessToken");
    router.push("/auth");
  };

  const handleSave = async () => {
    const input = linkUrl.trim();
    if (!input) { setSaveStatus("Please paste a link first."); return; }
    if (!userId) { setSaveStatus("Please log in first."); return; }
    setSaveLoading(true);
    setSaveStatus(null);
    try {
      const token = getToken();
      if (!token) { setSaveStatus("Please log in first."); return; }
      const response = await fetch(`${API_BASE_URL}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ originalUrl: input }),
      });
      if (!response.ok) throw new Error((await response.text()) || "Failed to save link.");
      const savedLink = (await response.json()) as SearchResult;
      if (showingAllLinks) {
        setResults((prev) =>
          prev.some((r) => r.id === savedLink.id)
            ? prev
            : [{ id: savedLink.id, originalUrl: savedLink.originalUrl, title: savedLink.title || savedLink.originalUrl, createdAt: savedLink.createdAt }, ...prev]
        );
      }
      setSaveStatus("Link saved. Embedding is being generated.");
      setLinkUrl("");
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Failed to save link.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSearch = async () => {
    const input = searchQuery.trim();
    if (!input) { setSearchStatus("Enter a search query."); return; }
    if (!userId) { setSearchStatus("Please log in first."); return; }
    setSearchLoading(true);
    setSearchStatus(null);
    setShowingAllLinks(false);
    try {
      const token = getToken();
      if (!token) { setSearchStatus("Please log in first."); return; }
      const res = await fetch(`${API_BASE_URL}/links/search?q=${encodeURIComponent(input)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.text()) || "Search failed.");
      const data = (await res.json()) as SearchResult[];
      setResults(data);
      if (data.length === 0) setSearchStatus("No results found.");
    } catch (error) {
      setSearchStatus(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleViewAll = async () => {
    if (!userId) { setSearchStatus("Please log in first."); return; }
    setSearchLoading(true);
    setSearchStatus(null);
    setShowingAllLinks(true);
    try {
      const token = getToken();
      if (!token) { setSearchStatus("Please log in first."); return; }
      const res = await fetch(`${API_BASE_URL}/links`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to fetch links.");
      const data = (await res.json()) as SearchResult[];
      setResults(data);
      if (data.length === 0) setSearchStatus("No links saved yet.");
    } catch (error) {
      setSearchStatus(error instanceof Error ? error.message : "Failed to fetch links.");
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

  const handleDeleteLink = async (id: string) => {
    if (!userId) return;
    setDeletingLinkId(id);
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/links/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to delete link.");
      setResults((prev) => {
        const next = prev.filter((r) => r.id !== id);
        if (next.length === 0) setSearchStatus(showingAllLinks ? "No links saved yet." : "No results found.");
        return next;
      });
      setShowDeletedPopup(true);
    } catch (error) {
      setSearchStatus(error instanceof Error ? error.message : "Failed to delete link.");
    } finally {
      setDeletingLinkId(null);
    }
  };

  const handleCreateCollection = async () => {
    const name = newColName.trim();
    if (!name) return;
    setCreatingCol(true);
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const col = (await res.json()) as Collection & { linkCount?: number };
        col.linkCount = col.linkCount ?? 0;
        setCollections((prev) => [col as Collection, ...prev]);
        setNewColName("");
        setShowNewColInput(false);
      }
    } finally {
      setCreatingCol(false);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/collections/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddToCollection = async (collectionId: string, linkId: string) => {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/collections/${collectionId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ linkId }),
    });
    if (res.ok) {
      const col = collections.find((c) => c.id === collectionId);
      setAddedToast(col ? `Added to "${col.name}"` : "Added to collection");
      setCollections((prev) =>
        prev.map((c) => c.id === collectionId ? { ...c, linkCount: c.linkCount + 1 } : c)
      );
    }
  };

  const isShowingResults = results.length > 0 || showingAllLinks;

  if (!userId) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {showDeletedPopup && (
        <div className="fixed right-6 top-6 z-50 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          deleted
        </div>
      )}
      {addedToast && (
        <div className="fixed right-6 top-6 z-50 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {addedToast}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
        {/* Header */}
        <header className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Stashly</p>
            <div className="flex items-center gap-3">
              {isShowingResults && (
                <button
                  onClick={handleBackToSearch}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  ← Home
                </button>
              )}
              {!isShowingResults && (
                <button
                  onClick={handleViewAll}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  View All
                </button>
              )}
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Dashboard
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
          <p className="max-w-2xl text-base text-slate-600">Save links and search by meaning.</p>
        </header>

        {/* Save link */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Paste a link</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleSave()}
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
            {saveStatus && <p className="text-sm text-slate-600">{saveStatus}</p>}
          </div>
        </section>

        {/* Search */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              {showingAllLinks ? "All saved links" : "Search your recall"}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
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
            {searchStatus && <p className="text-sm text-slate-600">{searchStatus}</p>}
          </div>

          {results.length > 0 && (
            <div className="mt-6 space-y-3">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {result.title || result.originalUrl}
                      </p>
                      <a
                        href={result.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-slate-500 underline decoration-slate-300 underline-offset-4 truncate"
                      >
                        {result.originalUrl}
                      </a>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {/* Add to collection */}
                      <div className="relative">
                        <button
                          type="button"
                          title="Add to collection"
                          onClick={() =>
                            setOpenMenuLinkId(openMenuLinkId === result.id ? null : result.id)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm text-slate-500 transition hover:bg-slate-100"
                        >
                          📁
                        </button>
                        {openMenuLinkId === result.id && (
                          <AddToCollectionMenu
                            linkId={result.id}
                            collections={collections}
                            onAdd={handleAddToCollection}
                            onClose={() => setOpenMenuLinkId(null)}
                          />
                        )}
                      </div>
                      {/* Delete */}
                      <button
                        type="button"
                        title="delete"
                        onClick={() => void handleDeleteLink(result.id)}
                        disabled={deletingLinkId === result.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-red-300 text-lg leading-none text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        −
                      </button>
                    </div>
                  </div>
                  {showingAllLinks && result.createdAt && (
                    <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">
                      {new Date(result.createdAt).toLocaleDateString()}
                    </p>
                  )}
                  {!showingAllLinks && result.score !== undefined && (
                    <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">
                      Score: {result.score.toFixed(4)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Collections grid — only when not in results/view-all mode */}
        {!isShowingResults && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Collections</h2>
              <button
                type="button"
                onClick={() => setShowNewColInput((v) => !v)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                + New
              </button>
            </div>

            {showNewColInput && (
              <div className="mb-4 flex gap-3">
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleCreateCollection()}
                  placeholder="Collection name..."
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateCollection}
                  disabled={creatingCol || !newColName.trim()}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            )}

            {collections.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 py-16 text-center">
                <p className="text-3xl">📁</p>
                <p className="mt-3 text-sm font-medium text-slate-500">No collections yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  Create one and start organizing your links.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {collections.map((col, i) => (
                  <CollectionCard
                    key={col.id}
                    col={col}
                    index={i}
                    onDelete={handleDeleteCollection}
                    onClick={(id) => router.push(`/collections/${id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
