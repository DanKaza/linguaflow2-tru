"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CsvExportButtonProps {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}

/**
 * Tombol export CSV generik (client) — dipakai dari halaman server
 * component yang melempar data sebagai props. BOM (\uFEFF) ditambahkan
 * supaya karakter Indonesia (mis. "²") terbaca benar di Excel.
 */
export function CsvExportButton({
  filename,
  headers,
  rows,
}: CsvExportButtonProps) {
  function download() {
    const escape = (cell: string | number) =>
      `"${String(cell).replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))]
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={download}>
      <Download size={15} /> Export CSV
    </Button>
  );
}
