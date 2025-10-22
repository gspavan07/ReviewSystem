import { useState, useEffect } from "react";
import TeamsTable from "./TeamsTable";

function ReviewerDashboard({
  teams,
  customColumns,
  currentUser,
  onLogout,
  onDataChange,
}) {
  const [activeTab, setActiveTab] = useState("teams");




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

  const menuItems = [{ id: "teams", label: "Teams", icon: "📊" }];

  const renderContent = () => {
    switch (activeTab) {
      case "teams":
        return (
          <TeamsTable
            teams={filteredTeams}
            customColumns={customColumns}
            isHead={false}
            onDataChange={onDataChange}
            currentUser={currentUser}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg fixed h-screen">
        <div className="p-6 border-b">
          <div className="flex items-center mb-3">
            <img src="/au_logo.svg" alt="AU Logo" className="h-8 w-8 mr-3" />
            <h1 className="text-xl font-bold text-gray-800">Reviewer Portal</h1>
          </div>
          <p className="text-sm text-gray-600">{currentUser.username}</p>
          <p className="text-xs text-gray-500 mt-1">
            Sections: {currentUser.assignedSections?.join(", ") || "None"}
          </p>
        </div>
        <nav className="mt-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                activeTab === item.id
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 p-6 border-t">
          <button
            onClick={onLogout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Logout
          </button>
          <p className="text-center text-gray-400 font-medium text-sm mt-4">
            Developed by <b className="text-gray-600">Team Ofzen</b>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8">{renderContent()}</div>
    </div>
  );
}

export default ReviewerDashboard;
