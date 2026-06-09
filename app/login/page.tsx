"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { LoginPageSkeleton } from "@/components/skeletons";
import { isAuthenticated, saveAuthTokens, getStoredRole } from "@/lib/auth";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import type { ApiSuccess } from "@/lib/types";
import Image from "next/image";

interface LoginResult {
  accessToken: string;
  refreshToken: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) navigate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navigate() {
    if (redirectTo) {
      router.replace(redirectTo);
      return;
    }
    const role = getStoredRole();
    router.replace(
      role === "lecturer" ? "/dashboard/lecturer" : "/dashboard/student",
    );
  }

  const handleDev = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await api.post<ApiSuccess<LoginResult>>("/v2/auth/login", {
        email,
      });
      const { accessToken, refreshToken } = (res as ApiSuccess<LoginResult>)
        .data;
      saveAuthTokens(accessToken, refreshToken);
      navigate();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoft = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
    window.location.href = `${base}/auth/microsoft`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <Logo height={28} />
        <ThemeToggle />
      </div>

      {/*
        Mobile: content starts near the top — no vertical centering.
        sm+: vertically centred in the remaining space.
      */}
      <div className="main  w-full h-[90vh] flex justify-center p-3 items-center gap-2">
        <div className="flex-1 flex flex-col justify-center px-5 py-10 sm:py-0">
          <div className="w-full max-w-sm mx-auto space-y-7">
            {/* Brand */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {redirectTo
                  ? "Sign in to complete your attendance submission."
                  : "Caleb University attendance management."}
              </p>
            </div>

            {/* Microsoft */}
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full h-11 gap-2.5 font-medium"
                onClick={handleMicrosoft}
              >
                <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden>
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                Continue with Microsoft
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-xs text-muted-foreground">
                    or dev bypass
                  </span>
                </div>
              </div>

              {/* Dev login form */}
              <form onSubmit={handleDev} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@calebuniversity.edu.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Sign in"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Prefix <code className="font-mono">std</code> = student ·
                  anything else = lecturer
                </p>
              </form>
            </div>
          </div>
        </div>

        <div className="heroImg hidden sm:flex text-white p-6 py-12 flex-col gap-3 justify-end w-1/2 rounded-3xl h-full min-h-[80vh] bg-cover bg-blend-overlay bg-center">
          <p className="ttl text-5xl max-w-[550px] font-semibold">
            Smarter Attendance for Smarter Learning.
          </p>
          <p className="max-w-[550px]">
            Track. Manage. Attend. A smart attendance system designed to make
            attendance faster, easier, and more reliable for lecturers and
            students
          </p>

          <div className="w-max text-xs p-1.5 gap-2 items-center pr-4 mt-4 bg-white text-black  rounded-full flex">
            <div style={{ overflow: "hidden" }} className="rounded-full">
              <Image
                alt="Caleb"
                style={{ overflow: "hidden" }}
                className="rounded-full"
                src="/caleb.png"
                height={55}
                width={55}
              />
            </div>
            <div className="">
              A PRODUCT OF
              <p className="font-bold">CALEB UNIVERSITY INNOVATION</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
