import { useState } from "react";
import { bulkUploadEmployees } from "./EmployeeApi";

export default function EmployeeBulkUpload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a CSV file");
      return;
    }

    try {
      setLoading(true);
      const response = await bulkUploadEmployees(file);
      setResult(response);
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white w-full min-h-screen bg-gray-100 p-6">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Bulk Upload Employees
        </h1>
        <p className="text-gray-500">
          Upload employees using CSV file
        </p>
      </div>

      {/* Upload Card */}
      <div className="bg-white shadow-lg rounded-xl p-8 w-full">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">

          {/* File Input */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>

            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            {loading ? "Uploading..." : "Upload File"}
          </button>

        </div>

        {/* Result Section */}
        {result && (
          <div className="mt-8 border-t pt-6">

            <h3 className="text-lg font-semibold mb-4">
              Upload Result
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-500 text-sm">Total Rows</p>
                <p className="text-xl font-bold">{result.total_rows}</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-gray-500 text-sm">Inserted</p>
                <p className="text-xl font-bold text-green-600">
                  {result.inserted}
                </p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-gray-500 text-sm">Failed</p>
                <p className="text-xl font-bold text-red-600">
                  {result.failed}
                </p>
              </div>

            </div>

            {/* Error List */}
            {result.failed > 0 && (
              <div className="mt-6 bg-gray-900 text-white p-4 rounded-lg overflow-auto max-h-80">
                <pre className="text-sm">
                  {JSON.stringify(result.errors, null, 2)}
                </pre>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}