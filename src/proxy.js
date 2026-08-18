import { NextResponse } from "next/server";
import { COOKIE_KEYS } from "@/lib/constants";

/** Routes that require a session. */
const PROTECTED_ROUTES = ["/my-account"];

/** Routes that only make sense while signed out. */
const GUEST_ONLY_ROUTES = ["/login", "/signup", "/verify-otp", "/forgot-password", "/reset-password"];

const matches = (pathname, routes) =>
  routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

export default function proxy(request) {
  const { pathname } = request.nextUrl;
  const isSignedIn = Boolean(request.cookies.get(COOKIE_KEYS.USER_ID)?.value);

  if (matches(pathname, PROTECTED_ROUTES) && !isSignedIn) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Preserve where the user was heading so `<Login />` can send them back.
    loginUrl.search = `?redirect=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(loginUrl);
  }

  if (matches(pathname, GUEST_ONLY_ROUTES) && isSignedIn) {
    const accountUrl = request.nextUrl.clone();
    accountUrl.pathname = "/my-account";
    accountUrl.search = "";
    return NextResponse.redirect(accountUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Skip API routes, Next internals and anything with a file extension.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
