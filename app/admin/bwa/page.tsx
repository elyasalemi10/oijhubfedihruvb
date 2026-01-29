"use client";

import { useCallback, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

type Row = {
  id: string;
  code: string;
  manufacturerDescription: string;
  price: string;
  imageUrl: string;
  notes: string;
};

export default function BwaPage() {
  const [rows, setRows] = useState<Row[]>([
    { id: crypto.randomUUID(), code: "", manufacturerDescription: "", price: "", imageUrl: "", notes: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedInfo, setParsedInfo] = useState<{ pageCount: number; productCount: number } | null>(null);

  const update = (id: string, field: keyof Row, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), code: "", manufacturerDescription: "", price: "", imageUrl: "", notes: "" },
    ]);

  const removeRow = (id: string) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handlePdfUpload = useCallback(async (file: File) => {
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    setParsing(true);
    setParsedInfo(null);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const res = await fetch("/api/admin/bwa/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Failed to parse PDF");
        return;
      }

      if (!data.products || data.products.length === 0) {
        toast.error("No products found in PDF. Check the format.");
        return;
      }

      // Convert parsed products to rows
      const newRows: Row[] = data.products.map((p: {
        code: string;
        manufacturerDescription: string;
        price: string;
        imageUrl: string;
        notes: string;
      }) => ({
        id: crypto.randomUUID(),
        code: p.code || "",
        manufacturerDescription: p.manufacturerDescription || "",
        price: p.price || "",
        imageUrl: p.imageUrl || "",
        notes: p.notes || "",
      }));

      setRows(newRows);
      setParsedInfo({ pageCount: data.pageCount, productCount: newRows.length });
      toast.success(`Extracted ${newRows.length} products from PDF`);
    } catch (err) {
      console.error("PDF parse error:", err);
      toast.error("Failed to parse PDF");
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handlePdfUpload(files[0]);
      }
    },
    [handlePdfUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handlePdfUpload(files[0]);
      }
      e.target.value = "";
    },
    [handlePdfUpload]
  );

  const handleImport = async () => {
    const payload = rows
      .filter((r) => r.code.trim())
      .map((r) => ({
        code: r.code.trim(),
        description: r.manufacturerDescription.trim() || r.code.trim(),
        manufacturerDescription: r.manufacturerDescription.trim(),
        productDetails: r.notes.trim(),
        price: r.price.trim(),
        imageUrl: r.imageUrl.trim(),
        areaName: "Other",
      }));

    if (payload.length === 0) {
      toast.error("Add at least one row with Product Code");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/product-selection/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to import");
      } else {
        toast.success(`Imported ${data?.products?.length ?? payload.length} products`);
      }
    } catch {
      toast.error("Failed to import");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-4">
      <Toaster />
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">BWA Import (Builder Warehouse AU)</h1>
        <p className="text-sm text-slate-600">
          Upload a BWA PDF to auto-extract products, or manually enter them below.
        </p>

        {/* PDF Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
            ${isDragging 
              ? "border-[#00f0ff] bg-[#00f0ff]/10" 
              : "border-slate-300 hover:border-[#00f0ff]/60 hover:bg-slate-100"
            }
            ${parsing ? "opacity-60 pointer-events-none" : ""}
          `}
        >
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={parsing}
          />
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors
              ${isDragging ? "bg-[#00f0ff]/20" : "bg-slate-200"}
            `}>
              {parsing ? (
                <svg className="w-8 h-8 text-[#00f0ff] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className={`w-8 h-8 ${isDragging ? "text-[#00f0ff]" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            <p className="text-lg font-medium text-slate-700 mb-1">
              {parsing ? "Extracting products..." : isDragging ? "Drop PDF here" : "Upload BWA PDF"}
            </p>
            <p className="text-sm text-slate-500 text-center">
              {parsing 
                ? "Parsing document and extracting product information..."
                : "Drag and drop a BWA quote/order PDF, or click to browse"
              }
            </p>
          </div>
        </div>

        {/* Parsed Info Banner */}
        {parsedInfo && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30">
            <svg className="w-5 h-5 text-[#00f0ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-slate-700">
              Extracted <strong>{parsedInfo.productCount}</strong> products from <strong>{parsedInfo.pageCount}</strong> page{parsedInfo.pageCount !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => {
                setRows([{ id: crypto.randomUUID(), code: "", manufacturerDescription: "", price: "", imageUrl: "", notes: "" }]);
                setParsedInfo(null);
              }}
              className="ml-auto text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Manual Entry Section */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Products</h2>
            <span className="text-sm text-slate-500">{rows.filter(r => r.code.trim()).length} products with codes</span>
          </div>
          <div className="grid grid-cols-[1.5fr,2fr,1fr,2fr,1fr] gap-3 text-sm font-semibold text-slate-600 mb-2">
            <span>Product Code</span>
            <span>Product Name (Manufacturer Description)</span>
            <span>Price (ex GST)</span>
            <span>Image URL (optional)</span>
            <span>Notes</span>
          </div>
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[1.5fr,2fr,1fr,2fr,1fr] gap-3 items-center text-sm"
              >
                <input
                  className="rounded border border-slate-300 px-2 py-1.5 focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] outline-none transition-colors"
                  value={r.code}
                  onChange={(e) => update(r.id, "code", e.target.value.toUpperCase())}
                  placeholder="e.g. BW-001"
                />
                <input
                  className="rounded border border-slate-300 px-2 py-1.5 focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] outline-none transition-colors"
                  value={r.manufacturerDescription}
                  onChange={(e) => update(r.id, "manufacturerDescription", e.target.value)}
                  placeholder="Product Name"
                />
                <input
                  className="rounded border border-slate-300 px-2 py-1.5 focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] outline-none transition-colors"
                  value={r.price}
                  onChange={(e) => update(r.id, "price", e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="99.99"
                />
                <input
                  className="rounded border border-slate-300 px-2 py-1.5 focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] outline-none transition-colors"
                  value={r.imageUrl}
                  onChange={(e) => update(r.id, "imageUrl", e.target.value)}
                  placeholder="https://..."
                />
                <div className="flex gap-2 items-center">
                  <input
                    className="rounded border border-slate-300 px-2 py-1.5 w-full focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] outline-none transition-colors"
                    value={r.notes}
                    onChange={(e) => update(r.id, "notes", e.target.value)}
                    placeholder="Notes"
                  />
                  {rows.length > 1 && (
                    <button
                      className="text-red-500 hover:text-red-700 text-xs whitespace-nowrap"
                      type="button"
                      onClick={() => removeRow(r.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="px-3 py-2 rounded-md border border-slate-300 text-sm hover:bg-slate-50 transition-colors"
              onClick={addRow}
            >
              + Add Row
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-[#00f0ff] text-[#36454f] text-sm font-semibold disabled:opacity-60 hover:bg-[#00f0ff]/80 transition-colors"
              onClick={handleImport}
              disabled={saving}
            >
              {saving ? "Importing..." : "Add to system"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
