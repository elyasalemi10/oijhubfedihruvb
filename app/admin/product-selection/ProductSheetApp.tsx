"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ApiProduct = {
  id: string;
  code: string;
  description: string;
  manufacturerDescription: string | null;
  productDetails: string | null;
  price: number | null;
  imageUrl: string;
  area: { id: string; name: string };
};

type SelectedProduct = {
  id: string;
  code: string;
  areaName: string;
  description: string;
  manufacturerDescription: string | null;
  productDetails: string | null;
  price: number | null;
  imageUrl: string;
  quantity: string;
  notes: string;
};

type Message = { type: "success" | "error" | "info"; text: string };

const API_BASE = "/api/admin/product-selection";

export default function ProductSheetApp() {
  const [message, setMessage] = useState<Message | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [address, setAddress] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [contactName, setContactName] = useState("");
  const [company, setCompany] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [selected, setSelected] = useState<SelectedProduct[]>([]);
  const [pdfParseInfo, setPdfParseInfo] = useState<{
    found: number;
    notFound: string[];
  } | null>(null);

  const productsByArea = useMemo(() => {
    return products.reduce<Record<string, ApiProduct[]>>((acc, p) => {
      acc[p.area] = acc[p.area] ? [...acc[p.area], p] : [p];
      return acc;
    }, {});
  }, [products]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        if (search.trim().length < 2) {
          setProducts([]);
          return;
        }
        const resp = await fetch(
          `/api/admin/products${search ? `?q=${encodeURIComponent(search)}` : ""}`,
          { signal: controller.signal }
        );
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}));
          throw new Error(
            errBody?.error ||
              errBody?.details ||
              `Failed to fetch products (${resp.status})`
          );
        }
        const data = await resp.json();
        setProducts(data.products || []);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setMessage({
            type: "error",
            text: err instanceof Error ? err.message : "Failed to fetch products",
          });
        }
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
    return () => controller.abort();
  }, [search]);

  const addProductToSelected = useCallback((p: ApiProduct) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.id === p.id);
      if (exists) return prev;
      return [
        ...prev,
        {
          ...p,
          areaName: p.area?.name || "Other",
          quantity: "",
          notes: "",
        },
      ];
    });
  }, []);

  const toggleSelect = (p: ApiProduct) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.id === p.id);
      if (exists) {
        return prev.filter((s) => s.id !== p.id);
      }
      return [
        ...prev,
        {
          ...p,
          areaName: p.area?.name || "Other",
          quantity: "",
          notes: "",
        },
      ];
    });
  };

  const updateSelected = (
    id: string,
    field: keyof Pick<SelectedProduct, "quantity" | "notes">,
    value: string
  ) => {
    setSelected((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // PDF Upload Handler
  const handlePdfUpload = useCallback(
    async (file: File) => {
      if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
        setMessage({ type: "error", text: "Please upload a PDF file" });
        return;
      }

      setParsingPdf(true);
      setMessage(null);
      setPdfParseInfo(null);

      try {
        const formData = new FormData();
        formData.append("pdf", file);

        const res = await fetch(`${API_BASE}/parse-pdf`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage({ type: "error", text: data?.error || "Failed to parse PDF" });
          return;
        }

        if (!data.products || data.products.length === 0) {
          setMessage({
            type: "info",
            text: data.notFoundCodes?.length
              ? `No matching products found. Codes in PDF: ${data.extractedCodes?.join(", ") || "none"}`
              : "No product codes found in the PDF.",
          });
          return;
        }

        // Add matching products to selection
        for (const product of data.products) {
          addProductToSelected(product);
        }

        setPdfParseInfo({
          found: data.products.length,
          notFound: data.notFoundCodes || [],
        });

        setMessage({
          type: "success",
          text: `Added ${data.products.length} products from PDF${
            data.notFoundCodes?.length
              ? `. ${data.notFoundCodes.length} codes not found.`
              : ""
          }`,
        });
      } catch (err) {
        console.error("PDF parse error:", err);
        setMessage({ type: "error", text: "Failed to parse PDF" });
      } finally {
        setParsingPdf(false);
      }
    },
    [addProductToSelected]
  );

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

  const validate = () => {
    if (!address.trim()) return "Address is required";
    if (selected.length === 0) return "Select at least one product";
    return null;
  };

  const buildPayloadProducts = () =>
    selected.map((p) => ({
      category: p.areaName,
      code: p.code,
      description: p.description,
      manufacturerDescription: p.manufacturerDescription,
      productDetails: p.productDetails,
      areaDescription: p.areaName,
      quantity: p.quantity,
      price: p.price?.toString() ?? "",
      notes: p.notes,
      image: null,
      imageUrl: p.imageUrl,
    }));

  const generateDocument = async () => {
    const error = validate();
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }

    setGenerating(true);
    setMessage(null);

    try {
      const payloadProducts = buildPayloadProducts();
      const resp = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          address: address.trim(),
          date,
          contactName: contactName.trim(),
          company: company.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
          products: payloadProducts,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || err.details || "Failed to generate file");
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Product_Selection_${address.replace(/\s+/g, "_")}_${date}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({
        type: "success",
        text: "Document generated and downloaded.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to generate file",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="container">
        <h1>Product Selection Generator</h1>
        <p className="subtitle">Generate product selection documents</p>

        {message && (
          <div
            className="card message-card"
            style={{
              background:
                message.type === "success"
                  ? "#d4edda"
                  : message.type === "info"
                  ? "#cce5ff"
                  : "#f8d7da",
              border: `1px solid ${
                message.type === "success"
                  ? "#c3e6cb"
                  : message.type === "info"
                  ? "#b8daff"
                  : "#f5c6cb"
              }`,
              color:
                message.type === "success"
                  ? "#155724"
                  : message.type === "info"
                  ? "#004085"
                  : "#721c24",
            }}
          >
            {message.text}
          </div>
        )}

        {/* PDF Upload Zone - BWA Only */}
        <div className="card">
          <h2 className="card-title">📄 Import from BWA PDF</h2>
          <p className="text-sm text-gray-600 mb-3">
            Upload a BWA quote/order PDF to automatically select matching products from your database.
          </p>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`pdf-drop-zone ${isDragging ? "dragging" : ""} ${parsingPdf ? "parsing" : ""}`}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileInput}
              className="pdf-input"
              disabled={parsingPdf}
            />
            <div className="pdf-drop-content">
              <div className={`pdf-icon ${parsingPdf ? "spinning" : ""}`}>
                {parsingPdf ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" opacity="0.25" />
                    <path d="M4 12a8 8 0 018-8" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <p className="pdf-title">
                {parsingPdf
                  ? "Extracting products..."
                  : isDragging
                  ? "Drop PDF here"
                  : "Upload BWA PDF"}
              </p>
              <p className="pdf-subtitle">
                {parsingPdf
                  ? "Matching product codes with database..."
                  : "Drag and drop a BWA PDF, or click to browse"}
              </p>
            </div>
          </div>

          {pdfParseInfo && pdfParseInfo.notFound.length > 0 && (
            <div className="not-found-codes">
              <p className="text-sm font-medium text-amber-700 mb-1">
                Codes not found in database:
              </p>
              <p className="text-xs text-amber-600">
                {pdfParseInfo.notFound.join(", ")}
              </p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">📄 Document Details</h2>
          <div className="grid">
            <div className="field">
              <label>Address *</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Property address"
              />
            </div>
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">👤 Client Details</h2>
          <div className="grid">
            <div className="field">
              <label>Contact Name</label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="field">
              <label>Company</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0400 000 000"
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title" style={{ margin: 0 }}>
              📦 Products from database (search by code/description)
            </h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type at least 2 chars to search..."
              style={{ minWidth: "260px" }}
            />
          </div>

          {loadingProducts && <p className="text-sm text-gray-500">Loading products...</p>}

          {!loadingProducts && products.length === 0 && search.trim().length >= 2 && (
            <p className="text-sm text-gray-500">No products found.</p>
          )}

          {Object.keys(productsByArea).map((area) => (
            <div key={area} className="product-card">
              <div className="product-header">
                <span className="product-title">{area}</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {productsByArea[area].map((product) => {
                  const isSelected = selected.some((s) => s.id === product.id);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between border border-slate-200 rounded px-3 py-2 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800">
                          {product.code}
                        </div>
                        <div className="text-slate-600 truncate">
                          {product.description}
                        </div>
                        {typeof product.price === "number" &&
                          Number.isFinite(product.price) && (
                            <div className="text-slate-900 font-semibold">
                              ${product.price.toFixed(2)}
                            </div>
                          )}
                      </div>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => toggleSelect(product)}
                      >
                        {isSelected ? "Remove" : "Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {selected.length > 0 && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title" style={{ margin: 0 }}>
                ✅ Selected products ({selected.length})
              </h2>
              <button
                className="btn-secondary btn-sm"
                onClick={() => setSelected([])}
              >
                Clear all
              </button>
            </div>
            <div className="space-y-2">
              {selected.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 border border-slate-200 rounded px-3 py-2 text-sm"
                >
                  <div className="font-semibold text-slate-800">
                    {item.code}
                  </div>
                  <div className="text-slate-600 flex-1 min-w-[180px] truncate">
                    {item.description}
                  </div>
                  <input
                    className="w-24 rounded border border-slate-300 px-2 py-1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateSelected(item.id, "quantity", e.target.value)}
                  />
                  <input
                    className="flex-1 min-w-[160px] rounded border border-slate-300 px-2 py-1"
                    placeholder="Notes"
                    value={item.notes}
                    onChange={(e) => updateSelected(item.id, "notes", e.target.value)}
                  />
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => toggleSelect(item as unknown as ApiProduct)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            className="btn-primary"
            onClick={generateDocument}
            disabled={generating}
            style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}
          >
            {generating ? "⏳ Generating..." : "📥 Generate Document"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen, Ubuntu, sans-serif;
          background: #f5f5f5;
          color: #333;
          line-height: 1.5;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        h1 {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: #666;
          margin-bottom: 2rem;
        }

        .card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .message-card {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .card-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* PDF Upload Zone Styles */
        .pdf-drop-zone {
          position: relative;
          border: 2px dashed #ddd;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .pdf-drop-zone:hover {
          border-color: #00f0ff;
          background: rgba(0, 240, 255, 0.03);
        }

        .pdf-drop-zone.dragging {
          border-color: #00f0ff;
          background: rgba(0, 240, 255, 0.08);
        }

        .pdf-drop-zone.parsing {
          opacity: 0.7;
          pointer-events: none;
        }

        .pdf-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .pdf-drop-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .pdf-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          margin-bottom: 0.5rem;
        }

        .pdf-icon.spinning svg {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .pdf-drop-zone.dragging .pdf-icon {
          background: rgba(0, 240, 255, 0.15);
          color: #00f0ff;
        }

        .pdf-title {
          font-weight: 600;
          color: #333;
        }

        .pdf-subtitle {
          font-size: 0.875rem;
          color: #666;
        }

        .not-found-codes {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 8px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .grid-3 {
          grid-template-columns: repeat(3, 1fr);
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .field.span-2 {
          grid-column: span 2;
        }

        .field.span-3 {
          grid-column: span 3;
        }

        label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #555;
        }

        input,
        select,
        textarea {
          padding: 0.5rem 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.875rem;
          width: 100%;
        }

        input:focus,
        select:focus,
        textarea:focus {
          outline: none;
          border-color: #00f0ff;
          box-shadow: 0 0 0 2px rgba(0, 240, 255, 0.15);
        }

        textarea {
          resize: vertical;
          min-height: 60px;
        }

        button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: #00f0ff;
          color: #36454f;
          font-weight: 600;
        }

        .btn-primary:hover {
          background: #00d4e0;
        }

        .btn-primary:disabled {
          background: #999;
          color: #fff;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #e0e0e0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #d0d0d0;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }

        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }

        .product-card {
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .product-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .product-title {
          font-weight: 600;
        }

        .flex {
          display: flex;
        }

        .items-center {
          align-items: center;
        }

        .justify-between {
          justify-content: space-between;
        }

        .justify-end {
          justify-content: flex-end;
        }

        .gap-2 {
          gap: 0.5rem;
        }

        .gap-4 {
          gap: 1rem;
        }

        .mb-4 {
          margin-bottom: 1rem;
        }

        .mb-3 {
          margin-bottom: 0.75rem;
        }

        .text-sm {
          font-size: 0.875rem;
        }

        .text-xs {
          font-size: 0.75rem;
        }

        .text-gray-600 {
          color: #666;
        }

        .image-preview {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid #ddd;
        }

        .image-placeholder {
          width: 60px;
          height: 60px;
          border: 2px dashed #ddd;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-size: 1.5rem;
        }

        .summary {
          background: #e8f5e9;
          border: 1px solid #c8e6c9;
        }

        .summary-list {
          list-style: none;
        }

        .summary-list li {
          padding: 0.25rem 0;
        }

        @media (max-width: 768px) {
          .grid-3 {
            grid-template-columns: 1fr;
          }
          .field.span-2,
          .field.span-3 {
            grid-column: span 1;
          }
        }
      `}</style>
    </>
  );
}
