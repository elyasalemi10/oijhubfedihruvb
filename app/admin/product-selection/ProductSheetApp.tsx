"use client";

import { useMemo, useState } from "react";

const CATEGORIES = [
  "Kitchen",
  "Bathroom",
  "Bedroom",
  "Living Room",
  "Laundry",
  "Balcony",
  "Other",
] as const;

type Category = (typeof CATEGORIES)[number];

type Product = {
  id: string;
  category: Category;
  code: string;
  description: string;
  manufacturerDescription: string;
  productDetails: string;
  areaDescription: string;
  quantity: string;
  price: string;
  notes: string;
  image: string | null; // base64 (no prefix)
  imagePreview: string | null; // data url for preview
};

type Message = { type: "success" | "error"; text: string };

const API_BASE = "/api/admin/product-selection";
const PLACEHOLDER_IMAGE = "https://placehold.co/600x600?text=No+Image";

function createEmptyProduct(): Product {
  return {
    id: crypto.randomUUID(),
    category: "Bathroom",
    code: "",
    description: "",
    manufacturerDescription: "",
    productDetails: "",
    areaDescription: "",
    quantity: "",
    price: "",
    notes: "",
    image: null,
    imagePreview: null,
  };
}

function buildProductPayload(products: Product[]) {
  return products
    .filter((p) => p.code.trim() || p.description.trim())
    .map((p) => ({
      category: p.category,
      code: p.code,
      description: p.description,
      manufacturerDescription: p.manufacturerDescription,
      productDetails: p.productDetails,
      areaDescription: p.areaDescription,
      quantity: p.quantity,
      price: p.price,
      notes: p.notes,
      image: p.image,
    }));
}

export default function ProductSheetApp() {
  const [message, setMessage] = useState<Message | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [address, setAddress] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [contactName, setContactName] = useState("");
  const [company, setCompany] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");

  const [products, setProducts] = useState<Product[]>([createEmptyProduct()]);

  const productsByCategory = useMemo(() => {
    return CATEGORIES.reduce((acc, cat) => {
      const filtered = products.filter((p) => p.category === cat);
      if (filtered.length > 0) acc[cat] = filtered;
      return acc;
    }, {} as Record<Category, Product[]>);
  }, [products]);

  const addProduct = () => {
    if (products.length >= 50) {
      setMessage({ type: "error", text: "Maximum 50 products allowed" });
      return;
    }
    setProducts((prev) => [...prev, createEmptyProduct()]);
  };

  const removeProduct = (id: string) => {
    if (products.length <= 1) {
      setMessage({ type: "error", text: "At least one product required" });
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateProduct = (
    id: string,
    field: keyof Product,
    value: string | null
  ) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const base64Data = base64.split(",")[1];
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, image: base64Data, imagePreview: base64 }
            : p
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const validate = (payloadProducts: ReturnType<typeof buildProductPayload>) => {
    if (!address.trim()) return "Address is required";
    if (payloadProducts.length === 0)
      return "At least one product with code or description is required";
    return null;
  };

  const saveProductsToDb = async () => {
    const payloadProducts = buildProductPayload(products);
    const error = validate(payloadProducts);
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const resp = await fetch(`${API_BASE}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ products: payloadProducts }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || err.details || "Failed to save products");
      }

      const result = await resp.json();
      const count = result?.products?.length ?? payloadProducts.length;
      setMessage({
        type: "success",
        text: `Saved ${count} product${count === 1 ? "" : "s"} to the database.`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save products",
      });
    } finally {
      setSaving(false);
    }
  };

  const generateDocument = async () => {
    const payloadProducts = buildProductPayload(products);
    const error = validate(payloadProducts);
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }

    setGenerating(true);
    setMessage(null);

    try {
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
            className="card"
            style={{
              background: message.type === "success" ? "#d4edda" : "#f8d7da",
              border: `1px solid ${
                message.type === "success" ? "#c3e6cb" : "#f5c6cb"
              }`,
              color: message.type === "success" ? "#155724" : "#721c24",
            }}
          >
            {message.text}
          </div>
        )}

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
              📦 Products ({products.length}/50)
            </h2>
            <button
              className="btn-secondary"
              onClick={addProduct}
              disabled={products.length >= 50}
            >
              + Add Product
            </button>
          </div>

          {products.map((product, index) => (
            <div key={product.id} className="product-card">
              <div className="product-header">
                <span className="product-title">Product #{index + 1}</span>
                <button
                  className="btn-danger btn-sm"
                  onClick={() => removeProduct(product.id)}
                >
                  ✕ Remove
                </button>
              </div>

              <div className="grid grid-3">
                <div className="field">
                  <label>Category *</label>
                  <select
                    value={product.category}
                    onChange={(e) =>
                      updateProduct(product.id, "category", e.target.value)
                    }
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Code</label>
                  <input
                    value={product.code}
                    onChange={(e) =>
                      updateProduct(product.id, "code", e.target.value)
                    }
                    placeholder="Product code"
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <input
                    value={product.description}
                    onChange={(e) =>
                      updateProduct(product.id, "description", e.target.value)
                    }
                    placeholder="Description"
                  />
                </div>
                <div className="field span-2">
                  <label>Manufacturer Description</label>
                  <textarea
                    value={product.manufacturerDescription}
                    onChange={(e) =>
                      updateProduct(
                        product.id,
                        "manufacturerDescription",
                        e.target.value
                      )
                    }
                    placeholder="Manufacturer description"
                  />
                </div>
                <div className="field">
                  <label>Product Details</label>
                  <input
                    value={product.productDetails}
                    onChange={(e) =>
                      updateProduct(product.id, "productDetails", e.target.value)
                    }
                    placeholder="Details"
                  />
                </div>
                <div className="field span-2">
                  <label>Area Description</label>
                  <input
                    value={product.areaDescription}
                    onChange={(e) =>
                      updateProduct(
                        product.id,
                        "areaDescription",
                        e.target.value
                      )
                    }
                    placeholder="Area where product will be used"
                  />
                </div>
                <div className="field">
                  <label>Quantity</label>
                  <input
                    value={product.quantity}
                    onChange={(e) =>
                      updateProduct(product.id, "quantity", e.target.value)
                    }
                    placeholder="Qty"
                  />
                </div>
                <div className="field">
                  <label>Price</label>
                  <input
                    value={product.price}
                    onChange={(e) =>
                      updateProduct(product.id, "price", e.target.value)
                    }
                    placeholder="$0.00"
                  />
                </div>
                <div className="field">
                  <label>Notes</label>
                  <input
                    value={product.notes}
                    onChange={(e) =>
                      updateProduct(product.id, "notes", e.target.value)
                    }
                    placeholder="Notes"
                  />
                </div>
                <div className="field span-3">
                  <label>Image (optional)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(product.id, file);
                      }}
                      style={{ maxWidth: "250px" }}
                    />
                    {product.imagePreview ? (
                      <div style={{ position: "relative" }}>
                        <img
                          src={product.imagePreview}
                          alt="Preview"
                          className="image-preview"
                        />
                        <button
                          className="btn-danger btn-sm"
                          style={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            borderRadius: "50%",
                            padding: "2px 6px",
                          }}
                          onClick={() => {
                            updateProduct(product.id, "image", null);
                            updateProduct(product.id, "imagePreview", null);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="image-placeholder">🖼</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {Object.keys(productsByCategory).length > 0 && (
          <div className="card summary">
            <h2 className="card-title" style={{ color: "#2e7d32" }}>
              📋 Products by Category
            </h2>
            <ul className="summary-list">
              {Object.entries(productsByCategory).map(([cat, prods]) => (
                <li key={cat}>
                  <strong>{cat}:</strong> {prods.length} product
                  {prods.length !== 1 ? "s" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            className="btn-secondary"
            onClick={saveProductsToDb}
            disabled={saving || generating}
            style={{ padding: "0.75rem 1.5rem" }}
          >
            {saving ? "Saving..." : "💾 Save products to DB"}
          </button>
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

        .card-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
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
          border-color: #0066cc;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
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
          background: #0066cc;
          color: white;
        }

        .btn-primary:hover {
          background: #0052a3;
        }

        .btn-primary:disabled {
          background: #999;
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

