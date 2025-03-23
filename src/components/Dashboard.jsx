import React from "react";
import { UserAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Account from "./Account";
import FileUpload from "./FileUpload";
import PatientSummary from "./PatientSummary";

const Dashboard = () => {
  const { session, signOut } = UserAuth();
  const navigate = useNavigate();

  console.log(session);

  const handleSignOut = async (e) => {
    e.preventDefault();
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Medi Dashboard</h1>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Profile */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Profile</h2>
          <Account key={session.user.id} session={session} />
        </div>

        {/* Right Column - Patient Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <PatientSummary />
        </div>
      </div>

      {/* Bottom Section - File Upload */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <FileUpload session={session} />
      </div>
    </div>
  );
};

export default Dashboard;
