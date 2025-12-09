"use client";

import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import { saveAs } from "file-saver";
import PizZip from "pizzip";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type Product = {
  id: string;
  code: string;
  name: string;
  area: string;
  description: string;
  manufacturerDescription: string | null;
  productDetails: string | null;
  price: number | null;
  imageUrl: string;
};

type SelectionRow = Product & {
  quantity: number;
  notes: string;
  areaDescriptionOverride: string;
};

function formatDate(dateString: string): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const date = new Date(dateString);
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    // Use proxy API to avoid CORS issues with R2
    const response = await fetch(
      `/api/admin/proxy-image?url=${encodeURIComponent(imageUrl)}`
    );
    
    if (!response.ok) {
      console.error("Failed to fetch image via proxy:", response.status);
      return "";
    }

    const data = await response.json();
    return data.base64 || "";
  } catch (error) {
    console.error("Error fetching image:", error);
    return ""; // Return empty string if image fetch fails
  }
}

export default function ProductSelection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<SelectionRow[]>([]);
  
  // Contact information fields
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [company, setCompany] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      void fetchResults(query);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  async function fetchResults(q: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { products: Product[] };
      setResults(data.products ?? []);
    } catch {
      // ignore fetch errors in UI
    } finally {
      setLoading(false);
    }
  }

  function addProduct(product: Product) {
    setSelection((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [
        ...prev,
        {
          ...product,
          quantity: 1,
          notes: "",
          areaDescriptionOverride: product.area,
        },
      ];
    });
  }

  function removeRow(id: string) {
    setSelection((prev) => prev.filter((row) => row.id !== id));
  }

  function updateRow(id: string, updates: Partial<SelectionRow>) {
    setSelection((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
    );
  }

  function validateBeforeSave(): boolean {
    if (!address.trim()) {
      setError("Address is required.");
      return false;
    }
    if (selection.length === 0) {
      setError("Add at least one product to the selection.");
      return false;
    }
    const missing = selection.find(
      (row) => !row.quantity || !row.areaDescriptionOverride
    );
    if (missing) {
      setError("Quantity and area description are required for each product.");
      return false;
    }
    setError(null);
    return true;
  }

  async function handleGenerate() {
    if (!validateBeforeSave()) return;

    setGenerating(true);
    setError(null);

    try {
      // Fetch all product images and convert to base64
      const itemsWithImages = await Promise.all(
        selection.map(async (row) => {
          const imageBase64 = await fetchImageAsBase64(row.imageUrl);
          
          // Format price safely
          let priceFormatted = "";
          if (row.price && typeof row.price === "number") {
            priceFormatted = `$${row.price.toFixed(2)}`;
          } else if (row.price) {
            const priceNum = Number(row.price);
            if (!isNaN(priceNum)) {
              priceFormatted = `$${priceNum.toFixed(2)}`;
            }
          }
          
          return {
            code: row.code,
            image: imageBase64, // Base64 string for image module
            description: row.description,
            "manufacturer-description": row.manufacturerDescription ?? "",
            "product-details": row.productDetails ?? "",
            "area-description": row.areaDescriptionOverride || row.area,
            quantity: row.quantity,
            price: priceFormatted,
            notes: row.notes || "",
          };
        })
      );

      // Fetch the template
      const templateResponse = await fetch("/product-selection.docx");
      const templateBlob = await templateResponse.arrayBuffer();

      const zip = new PizZip(templateBlob);

      // Configure ImageModule for product images
      const imageModule = new ImageModule({
        centered: false,
        getImage: (tagValue: string) => {
          // tagValue is the base64 string
          // Convert base64 to Uint8Array for browser compatibility
          const binaryString = atob(tagValue);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes;
        },
        getSize: () => {
          // 1.25 inches max width = 120 pixels at 96 DPI
          // Maintain aspect ratio with proportional height
          return [120, 90]; // width × height in pixels
        },
      });

      const doc = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
      });

      // Set the template data
      doc.setData({
        address,
        "contact-name": contactName,
        company,
        "phone-number": phoneNumber,
        email,
        date: formatDate(date),
        items: itemsWithImages,
      });

      // Render the document
      doc.render();

      // Generate the output
      const output = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Download the file
      const fileName = `Product-Selection-${address.replace(/\s+/g, "-")}-${date}.docx`;
      saveAs(output, fileName);

      setGenerating(false);
    } catch (err) {
      console.error("Error generating document:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to generate document. Please check the template format.";

      // Check if it's a duplicate tag error
      if (
        errorMessage.includes("Duplicate") ||
        errorMessage.includes("duplicate")
      ) {
        setError(
          "Template error: Word has split placeholders. Please delete and retype placeholders carefully in the template file without any formatting (no bold, italic, etc). Make sure each placeholder is typed as one continuous string."
        );
      } else {
        setError(`Failed to generate document: ${errorMessage}`);
      }
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Contact Information Section */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Contact Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Address<span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter property address"
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Contact Name
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Enter contact name"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Company
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Enter company name"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Phone Number
            </label>
            <input
              type="tel"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Date
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Will be formatted as: {formatDate(date)}
            </p>
          </div>
        </div>
      </div>

      {/* Product Search */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Add Products</h3>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Search Products
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, name, description, manufacturer..."
          />
        </div>

        {loading && (
          <p className="text-sm text-slate-500">Searching products...</p>
        )}

        {!loading && query && results.length === 0 && (
          <p className="text-sm text-slate-500">No products found.</p>
        )}

        {results.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {results.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 border border-slate-200 rounded-md hover:bg-slate-50"
              >
                <div className="relative h-12 w-16 flex-shrink-0 bg-slate-100 rounded overflow-hidden">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.description}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {product.code} — {product.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {product.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => addProduct(product)}
                  disabled={selection.some((s) => s.id === product.id)}
                >
                  {selection.some((s) => s.id === product.id)
                    ? "Added"
                    : "Add"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Products Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="p-3">Code</th>
              <th className="p-3">Name</th>
              <th className="p-3">Description</th>
              <th className="p-3">Area Desc</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Notes</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {selection.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="p-3 font-semibold">{row.code}</td>
                <td className="p-3">{row.name}</td>
                <td className="p-3">
                  <div className="max-w-xs truncate">{row.description}</div>
                </td>
                <td className="p-3">
                  <input
                    type="text"
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    value={row.areaDescriptionOverride}
                    onChange={(e) =>
                      updateRow(row.id, {
                        areaDescriptionOverride: e.target.value,
                      })
                    }
                    placeholder={row.area}
                    required
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    min="1"
                    className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                    value={row.quantity}
                    onChange={(e) =>
                      updateRow(row.id, {
                        quantity: Number(e.target.value) || 1,
                      })
                    }
                    required
                  />
                </td>
                <td className="p-3">
                  <input
                    type="text"
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    value={row.notes}
                    onChange={(e) =>
                      updateRow(row.id, { notes: e.target.value })
                    }
                    placeholder="Optional notes"
                  />
                </td>
                <td className="p-3">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeRow(row.id)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {selection.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="p-4 text-sm text-slate-500 text-center"
                >
                  No products added yet. Search and add products above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerate}
          disabled={generating || selection.length === 0}
          className="px-12 py-6 text-lg font-bold"
          style={{
            background: "linear-gradient(to right, #eab308, #d97706)",
            color: "white",
          }}
        >
          {generating ? "Generating Document..." : "Generate"}
        </Button>
      </div>
    </div>
  );
}
