"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function decodeJwt(token: string): { sub: string; email: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload));
    return { sub: decoded.sub, email: decoded.email };
  } catch {
    return null;
  }
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      router.push("/auth");
      return;
    }

    const decoded = decodeJwt(token);
    if (!decoded) {
      router.push("/auth");
      return;
    }

    localStorage.setItem("accessToken", token);
    localStorage.setItem("userId", decoded.sub);
    localStorage.setItem("userEmail", decoded.email);

    router.push("/");
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Signing you in...</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Signing you in...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}