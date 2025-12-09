"use client";

import { useState } from "react";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import ImageModule from "docxtemplater-image-module-free";
import { toast } from "react-hot-toast";

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

type SelectedProduct = Product & {
  quantity: number;
  areaDescription: string;
  notes: string;
};

export default function ProductSelectionForm() {
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [company, setCompany] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [date] = useState(() => {
    const now = new Date();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Search products
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.products || []);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search products");
    } finally {
      setLoading(false);
    }
  };

  // Add product to selection
  const addProduct = (product: Product) => {
    if (selectedProducts.find((p) => p.id === product.id)) {
      toast.error("Product already added");
      return;
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        ...product,
        quantity: 1,
        areaDescription: product.area,
        notes: "",
      },
    ]);
    toast.success("Product added");
  };

  // Remove product
  const removeProduct = (id: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== id));
  };

  // Update product field
  const updateProduct = (id: string, field: keyof SelectedProduct, value: any) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      )
    );
  };

  // Generate document
  const generateDocument = async () => {
    if (!address.trim()) {
      toast.error("Address is required");
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error("Add at least one product");
      return;
    }

    setGenerating(true);

    try {
      // Fetch template
      const templateRes = await fetch("/product-selection.docx");
      const templateArrayBuffer = await templateRes.arrayBuffer();

      // Load template
      const zip = new PizZip(templateArrayBuffer);

      // Configure image module
      const imageModule = new ImageModule({
        centered: false,
        getImage: (tagValue: string) => {
          // Convert base64 to Uint8Array
          const binary = atob(tagValue);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return bytes;
        },
        getSize: () => [120, 90], // 1.25 inches at 96 DPI
      });

      const doc = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
      });

      // Fetch product images and prepare data
      const items = await Promise.all(
        selectedProducts.map(async (product) => {
          // Fetch image via proxy
          const imageRes = await fetch(
            `/api/admin/proxy-image?url=${encodeURIComponent(product.imageUrl)}`
          );
          const imageData = await imageRes.json();

          return {
            code: product.code,
            image: imageData.base64 || "",
            description: product.description,
            "manufacturer-description": product.manufacturerDescription || "",
            "product-details": product.productDetails || "",
            "area-description": product.areaDescription,
            quantity: product.quantity.toString(),
            price: product.price ? `$${product.price.toFixed(2)}` : "",
            notes: product.notes,
          };
        })
      );

      // Set template data
      doc.setData({
        address,
        "contact-name": contactName,
        company,
        "phone-number": phoneNumber,
        email,
        date,
        items,
      });

      // Render document
      doc.render();

      // Generate output
      const output = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Download
      const filename = `Product-Selection-${address.replace(/\s+/g, "-")}-${Date.now()}.docx`;
      saveAs(output, filename);

      toast.success("Document generated successfully!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate document");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Address <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="123 Main Street"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="text"
              value={date}
              readOnly
              className="w-full border rounded px-3 py-2 bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Product Search */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Add Products</h2>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search products by name, code, description..."
          className="w-full border rounded px-3 py-2 mb-4"
        />

        {loading && <p className="text-gray-500">Searching...</p>}

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {searchResults.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50"
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-16 h-12 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-semibold">
                    {product.code} - {product.name}
                  </p>
                  <p className="text-sm text-gray-600">{product.description}</p>
                </div>
                <button
                  onClick={() => addProduct(product)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Products */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Selected Products</h2>

        {selectedProducts.length === 0 ? (
          <p className="text-gray-500">No products selected</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Area Description</th>
                  <th className="text-left p-2">Quantity</th>
                  <th className="text-left p-2">Notes</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedProducts.map((product) => (
                  <tr key={product.id} className="border-b">
                    <td className="p-2">{product.code}</td>
                    <td className="p-2">{product.name}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={product.areaDescription}
                        onChange={(e) =>
                          updateProduct(product.id, "areaDescription", e.target.value)
                        }
                        className="w-full border rounded px-2 py-1"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={product.quantity}
                        onChange={(e) =>
                          updateProduct(product.id, "quantity", parseInt(e.target.value) || 1)
                        }
                        className="w-20 border rounded px-2 py-1"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={product.notes}
                        onChange={(e) =>
                          updateProduct(product.id, "notes", e.target.value)
                        }
                        className="w-full border rounded px-2 py-1"
                      />
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={generateDocument}
          disabled={generating || !address || selectedProducts.length === 0}
          className="px-8 py-4 text-lg font-bold text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(to right, #eab308, #d97706)",
          }}
        >
          {generating ? "Generating..." : "Generate Document"}
        </button>
      </div>
    </div>
  );
}

