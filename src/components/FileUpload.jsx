import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { generateAISummary } from "../services/summaryGenerations";

const FileUpload = ({ session }) => {
  const [uploading, setUploading] = useState(false);
  const [visits, setVisits] = useState([]);
  const [clinicName, setClinicName] = useState("");
  const [typeOfVisit, setTypeOfVisit] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = React.useRef(null);
  const [translating, setTranslating] = useState({});
  const [translations, setTranslations] = useState({});
  const [targetLanguage, setTargetLanguage] = useState("");

  useEffect(() => {
    getVisits();
  }, [session]);

  async function getVisits() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("visits")
        .select("*")
        .eq("user_id", session.user.id)
        .order("visit_date", { ascending: false });

      if (error) throw error;
      if (data) setVisits(data);
    } catch (error) {
      console.error("Error fetching visits:", error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(event) {
    if (!event.target.files || event.target.files.length === 0) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    const file = event.target.files[0];
    setSelectedFile(file);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  async function readPdfText(file) {
    try {
      const fileName = file.name.replace(".pdf", "");
      const formattedName = fileName
        .split(/[_-]/)
        .join(" ")
        .replace(/([A-Z])/g, " $1")
        .trim();

      const prompt = `Please generate a brief, no longer than 2 sentences, medical visit summary based on this document title: ${formattedName}. 
        Include possible type of visit, potential medical conditions discussed, and any other relevant medical information 
        you can infer from the title. Keep it concise but informative. Don't do any formatting, just output the pure text.`;

      const summary = await generateAISummary(prompt);
      return summary;
    } catch (error) {
      console.error("Error generating summary:", error);
      return "Unable to generate summary";
    }
  }

  async function uploadFile() {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    try {
      setUploading(true);

      const aiSummary = await readPdfText(selectedFile);

      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: visitError } = await supabase.from("visits").insert({
        user_id: session.user.id,
        document_url: filePath,
        clinic_name: clinicName,
        type_of_visit: typeOfVisit,
        summary: aiSummary,
        visit_date: new Date(),
      });

      if (visitError) throw visitError;

      getVisits();
    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
      setClinicName("");
      setTypeOfVisit("");
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function downloadFile(path) {
    try {
      const { data, error } = await supabase.storage
        .from("pdfs")
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = path.split("/").pop();
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error.message);
    }
  }

  async function deleteVisit(visit) {
    try {
      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from("pdfs")
        .remove([visit.document_url]);

      if (storageError) throw storageError;

      // Delete the visit record from the database
      const { error: dbError } = await supabase
        .from("visits")
        .delete()
        .eq("id", visit.id);

      if (dbError) throw dbError;

      // Refresh the visits list
      getVisits();
    } catch (error) {
      console.error("Error deleting visit:", error.message);
      alert("Error deleting visit");
    }
  }

  const handleTranslate = async (visitId, summary) => {
    if (!targetLanguage) {
      alert("Please enter a target language first");
      return;
    }

    setTranslating((prev) => ({ ...prev, [visitId]: true }));
    try {
      const prompt = `Translate the following medical summary to ${targetLanguage}. 
        Maintain medical accuracy and terminology:\n\n${summary}`;
      const translated = await generateAISummary(prompt);
      setTranslations((prev) => ({ ...prev, [visitId]: translated }));
    } catch (error) {
      console.error("Translation error:", error);
      alert("Failed to translate. Please try again.");
    } finally {
      setTranslating((prev) => ({ ...prev, [visitId]: false }));
    }
  };

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Upload New Visit Document
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Clinic Name"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Type of Visit"
              value={typeOfVisit}
              onChange={(e) => setTypeOfVisit(e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="mt-4">
            <label
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors"
              htmlFor="pdf-upload"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Select PDF
            </label>
            <input
              ref={fileInputRef}
              style={{
                visibility: "hidden",
                position: "absolute",
              }}
              type="file"
              id="pdf-upload"
              accept="application/pdf"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </div>

          {selectedFile && (
            <div className="mt-4 p-6 border border-gray-200 rounded-lg bg-gray-50">
              <p className="font-medium text-gray-700 mb-2">Selected file:</p>
              <p className="text-gray-600 mb-4">{selectedFile.name}</p>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 inline-flex items-center mb-4"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Preview PDF
                </a>
              )}
              <button
                onClick={uploadFile}
                disabled={uploading || !clinicName || !typeOfVisit}
                className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  uploading || !clinicName || !typeOfVisit
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {uploading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  "Confirm Upload"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Visit History</h2>
          <input
            type="text"
            placeholder="Enter target language (e.g., Spanish)"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="px-3 py-1 border rounded-lg text-sm"
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        ) : visits.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No visits found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clinic Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visit Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type of Visit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Summary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {visit.clinic_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(visit.visit_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {visit.type_of_visit}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-md overflow-auto">
                        {translations[visit.id] ? (
                          <>
                            <p className="mb-2">{translations[visit.id]}</p>
                            <button
                              onClick={() =>
                                setTranslations((prev) => ({
                                  ...prev,
                                  [visit.id]: null,
                                }))
                              }
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Show Original
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="mb-2">
                              {visit.summary || "No summary available"}
                            </p>
                            <button
                              onClick={() =>
                                handleTranslate(visit.id, visit.summary)
                              }
                              disabled={translating[visit.id]}
                              className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
                            >
                              {translating[visit.id] ? (
                                <span className="flex items-center">
                                  <svg
                                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  Translating...
                                </span>
                              ) : (
                                <>
                                  <svg
                                    className="w-4 h-4 mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                                    ></path>
                                  </svg>
                                  Translate
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => downloadFile(visit.document_url)}
                        className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Download
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this visit?"
                            )
                          ) {
                            deleteVisit(visit);
                          }
                        }}
                        className="text-red-600 hover:text-red-800 font-medium inline-flex items-center"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
