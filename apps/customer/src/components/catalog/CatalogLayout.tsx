import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface CatalogLayoutProps {
  /** Breadcrumb trail — omit for root catalog pages */
  breadcrumbs?: BreadcrumbItem[];
  /** Main slot */
  children: React.ReactNode;
}

export const CatalogLayout: React.FC<CatalogLayoutProps> = ({
  breadcrumbs,
  children,
}) => {
  return (
    <div className="w-full min-h-screen bg-hive-cream/10 flex flex-col">
      {/* Breadcrumb — only shown when crumbs exist */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="w-full border-b border-hive-border/50 bg-white/60 backdrop-blur-sm">
          <nav
            aria-label="Breadcrumb"
            className="max-w-[1440px] mx-auto px-6 lg:px-8 h-11 flex items-center"
          >
            <ol className="flex items-center gap-1.5">
              <li>
                <Link
                  href="/"
                  className="text-xs text-hive-text-muted hover:text-hive-amber transition-colors font-medium"
                >
                  Home
                </Link>
              </li>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <li key={crumb.label} className="flex items-center gap-1.5">
                    <ChevronRight
                      className="w-3 h-3 text-hive-border flex-shrink-0"
                      strokeWidth={2.5}
                    />
                    {isLast || !crumb.href ? (
                      <span
                        className="text-xs font-bold text-hive-dark"
                        aria-current={isLast ? "page" : undefined}
                      >
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="text-xs text-hive-text-muted hover:text-hive-amber transition-colors font-medium"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      )}

      {/* Page Content */}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
};
