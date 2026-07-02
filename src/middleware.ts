import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const { pathname } = req.nextUrl;

    // Authenticated but no business profile → redirect to onboarding
    if (isAuth && pathname.startsWith("/dashboard") && !token?.hasBusiness) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Authenticated with business, accessing onboarding → redirect to dashboard
    if (isAuth && pathname.startsWith("/onboarding") && token?.hasBusiness) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};