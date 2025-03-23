import React, { useEffect, useState } from "react";
import { UserAuth } from "../context/AuthContext";
import { generateAISummary } from "../services/summaryGenerations.js";
import { supabase } from "../supabaseClient";

const PatientSummary = () => {
  const { session } = UserAuth();
  const [summary, setSummary] = useState("Loading summary...");
  const [error, setError] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [translatedSummary, setTranslatedSummary] = useState("");
  const [translating, setTranslating] = useState(false);
  const [showingTranslation, setShowingTranslation] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        // First, fetch all visits for the user
        const { data: visits, error: visitsError } = await supabase
          .from("visits")
          .select("summary")
          .eq("user_id", session.user.id);

        if (visitsError) throw visitsError;

        // Combine all summaries into one string
        const allSummaries = visits.map((visit) => visit.summary).join("\n");

        const prompt = `Given the following summaries of medical documents for this patient:\n\n${allSummaries}\n\n
            Please provide a comprehensive medical summary. Some things to include can be past health issues they've had, 
            prescriptions or medications they have received, pttern of medical visits and treatments.
            Keep it concise but informative. Output only the text, nothing else, no formatting or headers or anything. If nothing is provided, 
            please just say "Add a Document to Get Started"`;

        const response = await generateAISummary(prompt);
        setSummary(response);
      } catch (err) {
        console.error("Failed to get summary:", err);
        setError("Failed to generate summary. Please try again later.");
        setSummary(null);
      }
    };

    if (session?.user?.id) {
      fetchSummary();
    }
  }, [session]);

  const handleTranslate = async () => {
    if (!summary || !targetLanguage) return;

    setTranslating(true);
    try {
      const prompt = `Translate the following medical summary to ${targetLanguage}. Don't do any formating or headers or introductions, just provide the text.
      Maintain medical accuracy and terminology:\n\n${summary}`;
      const translated = await generateAISummary(prompt);
      setTranslatedSummary(translated);
      setShowingTranslation(true);
    } catch (err) {
      console.error("Translation failed:", err);
      setError("Failed to translate summary. Please try again later.");
    } finally {
      setTranslating(false);
    }
  };

  const toggleLanguage = () => {
    setShowingTranslation(!showingTranslation);
  };

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Medical Summary</h2>
        <div className="flex items-center space-x-2">
          {translatedSummary && (
            <button
              onClick={toggleLanguage}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Show {showingTranslation ? "English" : targetLanguage}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {showingTranslation ? translatedSummary : summary}
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Translate Summary
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter target language (e.g., Spanish, French)"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={handleTranslate}
                disabled={translating || !targetLanguage}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  translating || !targetLanguage
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {translating ? (
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
                    Translating...
                  </span>
                ) : (
                  "Translate"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientSummary;
