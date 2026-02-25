import { useState } from "react";

export default function DocumentUpload() {

  const [documents, setDocuments] = useState([
    { id: 1, name: "Aadhar Card", status: "Pending" },
    { id: 2, name: "PAN Card", status: "Pending" },
    { id: 3, name: "Resume", status: "Pending" }
  ]);

  const handleUpload = (id) => {
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id ? { ...doc, status: "Uploaded" } : doc
      )
    );
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-sm">

        <h2 className="text-xl font-semibold mb-6">
          Employee Document Upload
        </h2>

        <div className="space-y-4">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 border rounded-xl"
            >
              <div>
                <p className="font-medium">{doc.name}</p>
                <span
                  className={`text-sm ${
                    doc.status === "Uploaded"
                      ? "text-green-600"
                      : "text-orange-500"
                  }`}
                >
                  {doc.status}
                </span>
              </div>

              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={() => handleUpload(doc.id)}
                />
                <span className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                  Upload
                </span>
              </label>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
