"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function decodeJwt(token: string): { sub: string; email: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf-8")
    );
    return { sub: decoded.sub, email: decoded.email };
  } catch {
    return null;
  }
}

export default function CallbackPage() {
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