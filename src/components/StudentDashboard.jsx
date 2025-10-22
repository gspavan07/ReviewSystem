import React, { useState, useEffect } from "react";

function StudentDashboard({ currentUser, onLogout }) {
  const [studentBatch, setStudentBatch] = useState(null);
  const [uploadRequirements, setUploadRequirements] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchStudentData();
    fetchUploadRequirements();
    fetchSubmissions();
  }, []);

  const fetchStudentData = async () => {
    try {
      const response = await fetch("/api/teams");
      const teams = await response.json();
      const batch = teams.find(
        (team) => team.name === currentUser.assignedBatch
      );
      setStudentBatch(batch);
    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadRequirements = async () => {
    try {
      const response = await fetch("/api/upload-requirements");
      const requirements = await response.json();
      
      // Get student's section from batch name (e.g., "Batch A1" -> "A")
      const studentSection = currentUser.assignedBatch
        ?.replace("Batch ", "")
        ?.charAt(0)
        ?.toUpperCase();
      
      // Filter requirements that are active and apply to student's section
      const filteredRequirements = requirements.filter((req) => {
        if (!req.isActive) return false;
        
        // If no sections specified, applies to all
        if (!req.sections || req.sections.length === 0) return true;
        
        // Check if student's section is in the requirement's sections
        return req.sections.includes(studentSection);
      });
      
      setUploadRequirements(filteredRequirements);
    } catch (error) {
      console.error("Error fetching upload requirements:", error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await fetch("/api/submissions");
      const allSubmissions = await response.json();
      const mySubmissions = allSubmissions.filter(
        (sub) => sub.batchName === currentUser.assignedBatch
      );
      setSubmissions(mySubmissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const handleFileSelect = (requirementId, file) => {
    setSelectedFiles((prev) => ({
      ...prev,
      [requirementId]: file,
    }));
  };

  const handleFileUpload = async (requirementId) => {
    const file = selectedFiles[requirementId];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("batchName", currentUser.assignedBatch);

    try {
      const response = await fetch(`/api/upload-file/${requirementId}`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        showToast("File uploaded successfully!");
        fetchSubmissions();
        setSelectedFiles((prev) => {
          const updated = { ...prev };
          delete updated[requirementId];
          return updated;
        });
      } else {
        const error = await response.json();
        showToast(`Upload failed: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Upload failed. Please try again.", 'error');
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'uploads', label: 'Uploads', icon: '📁' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!studentBatch) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            No Batch Assigned
          </h2>
          <p className="text-gray-600 mb-6">
            You are not currently assigned to any batch. Please contact your
            administrator.
          </p>
          <button
            onClick={onLogout}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  const members = studentBatch.members.split(",").map((m) => m.trim());

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Welcome, {currentUser.username}!</h2>
              <p className="text-blue-100">Batch: {studentBatch.name}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">👥</span>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{members.length}</p>
                    <p className="text-gray-600">Team Members</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📁</span>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{uploadRequirements.length}</p>
                    <p className="text-gray-600">Upload Tasks</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">✅</span>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{submissions.length}</p>
                    <p className="text-gray-600">Submitted</p>
                  </div>
                </div>
              </div>
            </div>
            {uploadRequirements.filter(req => req.dueDate && !submissions.some(sub => sub.requirementId?._id === req._id || sub.requirementId === req._id)).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  ⏰ Upcoming Deadlines
                </h3>
                <div className="space-y-3">
                  {uploadRequirements
                    .filter(req => req.dueDate && !submissions.some(sub => sub.requirementId?._id === req._id || sub.requirementId === req._id))
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .map((req) => {
                      const dueDate = new Date(req.dueDate);
                      const today = new Date();
                      const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                      const isOverdue = daysLeft < 0;
                      const isUrgent = daysLeft <= 3 && daysLeft >= 0;
                      
                      return (
                        <div key={req._id} className={`p-4 rounded-lg border-l-4 ${
                          isOverdue ? 'bg-red-50 border-red-500' : 
                          isUrgent ? 'bg-yellow-50 border-yellow-500' : 
                          'bg-blue-50 border-blue-500'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-gray-800">{req.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-medium ${
                                isOverdue ? 'text-red-600' : 
                                isUrgent ? 'text-yellow-600' : 
                                'text-blue-600'
                              }`}>
                                {isOverdue ? `${Math.abs(daysLeft)} days overdue` : 
                                 daysLeft === 0 ? 'Due today' : 
                                 `${daysLeft} days left`}
                              </p>
                              <p className="text-xs text-gray-500">
                                Due: {dueDate.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  📋 Batch Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Batch Name/ID</label>
                    <p className="text-lg font-semibold text-gray-800">{studentBatch.name}</p>
                  </div>
                  {studentBatch.projectTitle && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Project Title</label>
                      <p className="text-lg text-gray-800">{studentBatch.projectTitle}</p>
                    </div>
                  )}
                  {studentBatch.guide && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Project Guide</label>
                      <p className="text-lg text-gray-800">{studentBatch.guide}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  👥 Batch Members
                </h3>
                <div className="space-y-3">
                  {members.map((member, index) => {
                    const rollNumber = member.match(/\(([^)]+)\)/) ? member.match(/\(([^)]+)\)/)[1] : null;
                    const name = member.replace(/\s*\([^)]*\)/, "");
                    return (
                      <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-blue-600 mr-3">👤</span>
                        <div>
                          <p className="font-medium text-gray-800">{name}</p>
                          {rollNumber && <p className="text-sm text-gray-600">{rollNumber}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      

      
      case 'uploads':
        return (
          <div className="space-y-6">
            {uploadRequirements.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                <span className="text-4xl mb-4 block">📁</span>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Upload Requirements</h3>
                <p className="text-gray-600">There are currently no upload requirements for your batch.</p>
              </div>
            ) : (
              uploadRequirements.map((req) => {
                const hasSubmitted = submissions.some(
                  (sub) => sub.requirementId?._id === req._id || sub.requirementId === req._id
                );
                return (
                  <div key={req._id} className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-800 text-lg">{req.title}</h4>
                        <p className="text-gray-600 mt-1">{req.description}</p>
                        {req.dueDate && (
                          <p className="text-gray-500 text-sm mt-2">
                            Due: {new Date(req.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {hasSubmitted ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          ✓ Submitted
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                          Pending
                        </span>
                      )}
                    </div>
                    {!hasSubmitted && (
                      <div className="border-t pt-4">
                        <div className="flex gap-3 items-center">
                          <input
                            type="file"
                            onChange={(e) => {
                              if (e.target.files[0]) {
                                handleFileSelect(req._id, e.target.files[0]);
                              }
                            }}
                            className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <button
                            onClick={() => handleFileUpload(req._id)}
                            disabled={!selectedFiles[req._id]}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              selectedFiles[req._id]
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            Upload
                          </button>
                        </div>
                        {selectedFiles[req._id] && (
                          <p className="text-sm text-gray-600 mt-2">
                            Selected: {selectedFiles[req._id].name}
                          </p>
                        )}
                      </div>
                    )}
                    {hasSubmitted && (
                      <div className="border-t pt-4">
                        {submissions
                          .filter((sub) => sub.requirementId?._id === req._id || sub.requirementId === req._id)
                          .map((sub) => (
                            <div key={sub._id} className="flex items-center justify-between text-sm text-gray-600">
                              <span>
                                Uploaded: {sub.originalName} on {new Date(sub.uploadedAt).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => window.open(`/api/download/${sub._id}`, '_blank')}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                              >
                                Download
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.message}
        </div>
      )}
      
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center mb-3">
            <img src="/au_logo.svg" alt="AU Logo" className="h-8 w-8 mr-3" />
            <h1 className="text-xl font-bold text-gray-800">Student Portal</h1>
          </div>
          <p className="text-sm text-gray-600">{currentUser.username}</p>
        </div>
        <nav className="mt-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
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
      <div className="flex-1 p-8">
        {renderContent()}
      </div>
    </div>
  );
}

export default StudentDashboard;