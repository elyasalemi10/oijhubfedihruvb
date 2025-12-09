"use client";

import { useState } from "react";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";

type TableRow = {
  context: string;
  finding: string;
};

export default function ProductSelectionForm() {
  const [address, setAddress] = useState("");
  const [date] = useState(() => {
    const now = new Date();
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
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  });

  const [rows, setRows] = useState<TableRow[]>([
    { context: "", finding: "" },
  ]);

  const [generating, setGenerating] = useState(false);

  const addRow = () => {
    setRows([...rows, { context: "", finding: "" }]);
  };

  const updateRow = (index: number, field: keyof TableRow, value: string) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const generateDocument = async () => {
    if (!address) {
      toast.error("Please enter an address");
      return;
    }

    setGenerating(true);

    try {
      // Fetch template
      const response = await fetch("/product-selection.docx");
      if (!response.ok) throw new Error("Failed to fetch template");

      const arrayBuffer = await response.arrayBuffer();
      const zip = new PizZip(arrayBuffer);

      // Create document
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Set data
      doc.setData({
        address: address,
        date: date,
        backgrounds: rows,
      });

      doc.render();

      // Generate file
      const blob = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      saveAs(blob, `Selection_${address.replace(/\s+/g, "_")}_${Date.now()}.docx`);
      toast.success("Document generated successfully!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate document");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Fields */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Document Details
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter address..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date
            </label>
            <input
              type="text"
              value={date}
              disabled
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Table Rows */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Context & Findings Table
          </h2>
          <button
            onClick={addRow}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium"
          >
            + Add Row
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_1fr_auto] gap-3 items-start"
            >
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Context Detail
                </label>
                <input
                  type="text"
                  value={row.context}
                  onChange={(e) => updateRow(index, "context", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="e.g., Kitchen flooring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Finding/Requirement
                </label>
                <input
                  type="text"
                  value={row.finding}
                  onChange={(e) => updateRow(index, "finding", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="e.g., Porcelain tiles, 600x600mm"
                />
              </div>
              <button
                onClick={() => removeRow(index)}
                disabled={rows.length === 1}
                className="mt-6 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="Remove row"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Preview Table */}
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Preview (will appear in document)
          </h3>
          <div className="border border-slate-300 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700 border-b">
                    Context Detail
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700 border-b">
                    Finding/Requirement
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-b last:border-b-0">
                    <td className="px-4 py-2 text-slate-600">
                      {row.context || (
                        <span className="text-slate-400 italic">Empty</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {row.finding || (
                        <span className="text-slate-400 italic">Empty</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end">
        <button
          onClick={generateDocument}
          disabled={generating || !address}
          className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? "Generating..." : "Generate Document"}
        </button>
      </div>

      {/* Template Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          📋 Template Structure
        </h3>
        <div className="text-xs text-blue-800 space-y-1 font-mono">
          <p>
            Header placeholders: <code className="bg-blue-100 px-1 py-0.5 rounded">{"{{address}}"}</code>,{" "}
            <code className="bg-blue-100 px-1 py-0.5 rounded">{"{{date}}"}</code>
          </p>
          <p>
            Table loop: <code className="bg-blue-100 px-1 py-0.5 rounded">{"{#backgrounds}"}</code> ...{" "}
            <code className="bg-blue-100 px-1 py-0.5 rounded">{"{/backgrounds}"}</code>
          </p>
          <p>
            Row fields: <code className="bg-blue-100 px-1 py-0.5 rounded">{"{{context}}"}</code>,{" "}
            <code className="bg-blue-100 px-1 py-0.5 rounded">{"{{finding}}"}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
