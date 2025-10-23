import { useState, useEffect } from "react";
import TeamsTable from "./TeamsTable";
import { FaUsers, FaSignOutAlt } from "react-icons/fa";

function ReviewerDashboard({
  teams,
  customColumns,
  currentUser,
  onLogout,
  onDataChange,
}) {
  const filteredTeams = teams.filter((team) => {
    // Check if assigned to specific batch name or section letter
    const sectionLetter = team.name
      .replace("Batch ", "")
      .charAt(0)
      .toUpperCase();
    return (
      currentUser.assignedSections?.includes(team.name) ||
      currentUser.assignedSections?.includes(sectionLetter)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src="/au_logo.svg" alt="AU Logo" className="h-8 w-8 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">Reviewer Portal</h1>
                <p className="text-sm text-gray-600">
                  {currentUser.username} • Sections: {currentUser.assignedSections?.join(", ") || "None"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
              >
                <FaSignOutAlt /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <TeamsTable
          teams={filteredTeams}
          customColumns={customColumns}
          isHead={false}
          onDataChange={onDataChange}
          currentUser={currentUser}
        />
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 font-medium text-sm">
            Developed by <b className="text-gray-600">Team Ofzen</b>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ReviewerDashboard;
