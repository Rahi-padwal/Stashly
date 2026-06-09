"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

type Link = {
  id: string;
  originalUrl: string;
  title: string | null;
  createdAt: string;
};

type CollectionData = {
  collection: { id: string; name: string };
  links: Link[];
};

export default function CollectionDetail() {
  const router = useRouter();
  const params = useParams();
  const collectionId = params.id as string;

  const [data, setData] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removedToast, setRemovedToast] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token || !localStorage.getItem("userId")) {
      router.push("/auth");
      return;
    }
    fetch(`${API_BASE_URL}/collections/${collectionId}/links`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load collection.");
        return res.json() as Promise<CollectionData>;
      })
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load collection.")
      )
      .finally(() => setLoading(false));
  }, [collectionId, router]);

  useEffect(() => {
    if (!removedToast) return;
    const id = window.setTimeout(() => setRemovedToast(false), 1800);
    return () => window.clearTimeout(id);
  }, [removedToast]);

  const handleRemove = async (linkId: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token || !data) return;
    setRemovingId(linkId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/collections/${collectionId}/links/${linkId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setData((prev) =>
          prev
            ? { ...prev, links: prev.links.filter((l) => l.id !== linkId) }
            : prev
        );
        setRemovedToast(true);
      }
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading collection...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-red-500">{error ?? "Something went wrong."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {removedToast && (
        <div className="fixed right-6 top-6 z-50 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          removed
        </div>
      )}

      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mb-2 text-sm text-slate-400 hover:text-slate-600"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-slate-900">{data.collection.name}</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {data.links.length} {data.links.length === 1 ? "link" : "links"}
            </p>
          </div>
        </header>

        {data.links.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 py-20 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-3 text-sm font-medium text-slate-500">No links yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Search for a link on the home page and add it here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.links.map((link) => (
              <div
                key={link.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">
                    {link.title || link.originalUrl}
                  </p>
                  <a
                    href={link.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block truncate text-sm text-slate-500 underline decoration-slate-300 underline-offset-4"
                  >
                    {link.originalUrl}
                  </a>
                  <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">
                    {new Date(link.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  title="Remove from collection"
                  onClick={() => void handleRemove(link.id)}
                  disabled={removingId === link.id}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-red-300 text-lg leading-none text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                >
                  −
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
