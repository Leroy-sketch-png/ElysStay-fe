import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { SkipLink } from "@/components/SkipLink";
import { OfflineBanner } from "@/components/OfflineBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | ElysStay",
    default: "ElysStay — Nền tảng quản lý cho thuê thông minh",
  },
  description: "Hệ thống quản lý phòng trọ, căn hộ cho thuê toàn diện dành cho chủ nhà, nhân viên vận hành và khách thuê.",
  keywords: ["quản lý nhà trọ", "quản lý căn hộ", "thuê phòng", "elysstay", "property management", "phần mềm quản lý", "bất động sản"],
  authors: [{ name: "ElysStay Team" }],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://elysstay.com",
    title: "ElysStay — Nền tảng quản lý cho thuê thông minh",
    description: "Hệ thống quản lý phòng trọ, căn hộ cho thuê toàn diện dành cho chủ nhà, nhân viên vận hành và khách thuê.",
    siteName: "ElysStay",
  },
  twitter: {
    card: "summary_large_image",
    title: "ElysStay — Nền tảng quản lý cho thuê thông minh",
    description: "Hệ thống quản lý phòng trọ, căn hộ cho thuê toàn diện.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta charSet='utf-8' />
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('elysstay-theme');var d=document.documentElement;if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.classList.add('dark');d.style.colorScheme='dark'}else{d.classList.add('light');d.style.colorScheme='light'}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <SkipLink />
              {children}
              <Toaster />
              <OfflineBanner />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

