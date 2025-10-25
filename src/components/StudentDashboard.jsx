import React, { useState, useEffect } from "react";
import { 
  FaHome, FaUpload, FaUsers, FaFolder, FaCheck, FaClock, 
  FaClipboardList, FaUser, FaDownload, FaSignOutAlt, FaLock, FaUnlock, FaBars, FaTimes 
} from "react-icons/fa";

function StudentDashboard({ currentUser, onLogout }) {
  const [studentBatch, setStudentBatch] = useState(null);
  const [uploadRequirements, setUploadRequirements] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchStudentData();
    fetchUploadRequirements();
    fetchSubmissions();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates");
      const templatesData = await response.json();
      setTemplates(templatesData);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

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

    setUploadingFiles(prev => ({ ...prev, [requirementId]: true }));
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
    } finally {
      setUploadingFiles(prev => ({ ...prev, [requirementId]: false }));
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaHome /> },
    { id: 'uploads', label: 'Uploads', icon: <FaFolder /> },
    { id: 'templates', label: 'Templates', icon: <FaDownload /> },
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
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-6 text-white">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Welcome, {currentUser.username}!</h2>
              <p className="text-blue-100 text-sm sm:text-base">Batch: {studentBatch.name}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <FaUsers className="text-xl sm:text-2xl mr-2 sm:mr-3 text-blue-600" />
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-800">{members.length}</p>
                    <p className="text-gray-600 text-sm sm:text-base">Team Members</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <FaFolder className="text-xl sm:text-2xl mr-2 sm:mr-3 text-green-600" />
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-800">{uploadRequirements.length}</p>
                    <p className="text-gray-600 text-sm sm:text-base">Upload Tasks</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <FaCheck className="text-xl sm:text-2xl mr-2 sm:mr-3 text-purple-600" />
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-800">{submissions.length}</p>
                    <p className="text-gray-600 text-sm sm:text-base">Submitted</p>
                  </div>
                </div>
              </div>
            </div>
            {uploadRequirements.filter(req => req.dueDate && !submissions.some(sub => sub.requirementId?._id === req._id || sub.requirementId === req._id)).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                  <FaClock className="mr-2" /> Upcoming Deadlines
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                  <FaClipboardList className="mr-2" /> Batch Information
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
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                  <FaUsers className="mr-2" /> Batch Members
                </h3>
                <div className="space-y-3">
                  {members.map((member, index) => {
                    const rollNumber = member.match(/\(([^)]+)\)/) ? member.match(/\(([^)]+)\)/)[1] : null;
                    const name = member.replace(/\s*\([^)]*\)/, "");
                    return (
                      <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <FaUser className="text-blue-600 mr-3" />
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
              <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8 text-center">
                <FaFolder className="text-3xl sm:text-4xl mb-4 text-gray-400 mx-auto" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">No Upload Requirements</h3>
                <p className="text-gray-600 text-sm sm:text-base">There are currently no upload requirements for your batch.</p>
              </div>
            ) : (
              uploadRequirements.map((req) => {
                const submission = submissions.find(
                  (sub) => sub.requirementId?._id === req._id || sub.requirementId === req._id
                );
                const hasSubmitted = !!submission;
                const isLocked = submission?.isLocked || false;
                return (
                  <div key={req._id} className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 text-base sm:text-lg">{req.title}</h4>
                        <p className="text-gray-600 mt-1 text-sm sm:text-base">{req.description}</p>
                        {req.dueDate && (
                          <p className="text-gray-500 text-sm mt-2">
                            Due: {new Date(req.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {hasSubmitted ? (
                        isLocked ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
                            <FaCheck /> Submitted
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-1">
                            <FaUpload /> Can Re-upload
                          </span>
                        )
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                          Pending
                        </span>
                      )}
                    </div>
                    {(!hasSubmitted || !isLocked) && (
                      <div className="border-t pt-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                          <div className="flex-1">
                            <input
                              type="file"
                              accept={req.allowedFormats?.join(',') || '*'}
                              onChange={(e) => {
                                if (e.target.files[0]) {
                                  handleFileSelect(req._id, e.target.files[0]);
                                }
                              }}
                              className="w-full text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {req.allowedFormats && req.allowedFormats.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Allowed formats: {req.allowedFormats.join(', ')}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleFileUpload(req._id)}
                            disabled={!selectedFiles[req._id] || uploadingFiles[req._id]}
                            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
                              selectedFiles[req._id] && !uploadingFiles[req._id]
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            {uploadingFiles[req._id] ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <FaUpload />
                                {hasSubmitted ? 'Re-upload' : 'Upload'}
                              </>
                            )}
                          </button>
                        </div>
                        {selectedFiles[req._id] && (
                          <p className="text-sm text-gray-600 mt-2">
                            Selected: {selectedFiles[req._id].name}
                          </p>
                        )}
                        {hasSubmitted && !isLocked && (
                          <p className="text-sm text-green-600 mt-2">
                            ✓ Upload unlocked - You can replace your file
                          </p>
                        )}
                      </div>
                    )}
                    {hasSubmitted && (
                      <div className="border-t pt-4">
                        {submissions
                          .filter((sub) => sub.requirementId?._id === req._id || sub.requirementId === req._id)
                          .map((sub) => (
                            <div key={sub._id} className="space-y-2">
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>
                                  Uploaded: {sub.originalName} on {new Date(sub.uploadedAt).toLocaleDateString()}
                                </span>
                                <button
                                  onClick={() => window.open(`/api/download/${sub._id}`, '_blank')}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                                >
                                  <FaDownload /> Download
                                </button>
                              </div>
                              <div className="flex items-center text-xs mt-1">
                                {sub.isLocked ? (
                                  <span className="text-red-600 flex items-center">
                                    <FaLock className="mr-1" /> File upload is locked
                                  </span>
                                ) : (
                                  <span className="text-green-600 flex items-center">
                                    <FaUnlock className="mr-1" /> Upload unlocked - can be replaced
                                  </span>
                                )}
                              </div>
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
      
      case 'templates':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                <FaDownload className="mr-2" /> Document Templates
              </h3>
              <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                Download templates provided by your instructors to help with document preparation.
              </p>
              {templates.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <FaDownload className="text-3xl sm:text-4xl mb-4 text-gray-400 mx-auto" />
                  <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">No Templates Available</h4>
                  <p className="text-gray-600 text-sm sm:text-base">Your instructors haven't uploaded any templates yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template._id}
                      className="bg-gray-50 p-4 rounded-lg border hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-800">{template.title}</h4>
                          {template.description && (
                            <p className="text-gray-600 text-sm mt-1">{template.description}</p>
                          )}
                          <p className="text-gray-500 text-xs mt-2">
                            File: {template.originalName}
                          </p>
                          <p className="text-gray-500 text-xs">
                            Uploaded: {new Date(template.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`/api/templates/${template._id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium flex items-center justify-center gap-2"
                      >
                        <FaDownload /> Download Template
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 sm:px-6 py-3 rounded-lg shadow-lg text-white text-sm sm:text-base ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.message}
        </div>
      )}
      
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-6 right-6 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`w-64 bg-white shadow-lg fixed lg:static h-full z-40 transform transition-transform duration-300 flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4 sm:p-6 border-b">
          <div className="flex items-center mb-3">
            <img src="/au_logo.svg" alt="AU Logo" className="h-6 sm:h-8 w-6 sm:w-8 mr-2 sm:mr-3" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">Student Portal</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-600">{currentUser.username}</p>
        </div>
        <nav className="mt-6 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 sm:px-6 py-3 text-left transition-colors text-sm sm:text-base ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2 sm:mr-3">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 sm:p-6 border-t mt-auto">
          <button
            onClick={onLogout}
            className="w-full px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <FaSignOutAlt /> Logout
          </button>
          <p className="text-center text-gray-400 font-medium text-xs sm:text-sm mt-4">
            Developed by <b className="text-gray-600">Team Ofzen</b>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </div>
    </div>
  );
}

export default StudentDashboard;