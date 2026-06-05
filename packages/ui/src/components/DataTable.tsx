import React from "react";
import { cn } from "../utils/cn";
import { Loader2 } from "lucide-react";

export interface ColumnConfig<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: ColumnConfig<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No items to show",
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-hidden border border-hive-border rounded-2xl shadow-sm bg-white", className)}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-hive-cream/40 border-b border-hive-border text-xs font-bold uppercase tracking-wider text-hive-text-muted">
              {columns.map((col) => (
                <th key={col.key} className={cn("px-6 py-4.5", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hive-border/40 text-sm text-hive-text">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center text-hive-text-muted">
                  <div className="flex flex-col items-center gap-2 justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-hive-gold" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Fetching details...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center text-hive-text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-hive-cream/10 transition-colors duration-150"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-6 py-4.5 align-middle", col.className)}>
                      {col.render ? col.render(row, rowIndex) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
