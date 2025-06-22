import { ReactNode } from "react";
import { Header } from "./Header";
import { ThemeProvider } from "next-themes";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">{children}</main>
        <footer className="w-full text-center py-4 text-muted-foreground text-sm flex flex-col items-center gap-1">
          <span>
            Made with <span className="text-red-500">❤️</span> by Symmetry |
            <a
              href="https://www.linkedin.com/in/vinayaktiwari9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center ml-1 text-blue-500 hover:text-blue-600 transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="w-5 h-5"
              >
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm15.5 11.268h-3v-5.604c0-1.337-.025-3.063-1.868-3.063-1.868 0-2.154 1.459-2.154 2.967v5.7h-3v-10h2.881v1.367h.041c.401-.761 1.379-1.563 2.841-1.563 3.039 0 3.6 2.001 3.6 4.601v5.595z"/>
              </svg>
            </a>
          </span>
        </footer>
      </div>
    </ThemeProvider>
  );
}
