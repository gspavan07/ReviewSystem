import { useState, useEffect } from "react";
import TeamsTable from "./TeamsTable";
import {
  FaUsers,
  FaColumns,
  FaUserFriends,
  FaUpload,
  FaClipboardList,
  FaChartBar,
  FaPlus,
  FaTrash,
  FaEdit,
  FaDownload,
  FaFileExcel,
  FaInfoCircle,
  FaSignOutAlt,
  FaUnlock,
  FaLock,
  FaTimes,
  FaCheck,
  FaFileAlt,
  FaTachometerAlt,
} from "react-icons/fa";

function HeadDashboard({
  teams,
  customColumns,
  currentUser,
  onLogout,
  onDataChange,
}) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [columnName, setColumnName] = useState("");
  const [columnType, setColumnType] = useState("team");
  const [inputType, setInputType] = useState("text");
  const [options, setOptions] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [removeColumnSelect, setRemoveColumnSelect] = useState("");
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newUserRole, setNewUserRole] = useState("reviewer");
  const [assignedSections, setAssignedSections] = useState("");

  const [filterSection, setFilterSection] = useState("All");
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [uploadRequirements, setUploadRequirements] = useState([]);
  const [newRequirementTitle, setNewRequirementTitle] = useState("");
  const [newRequirementDescription, setNewRequirementDescription] =
    useState("");
  const [newRequirementDueDate, setNewRequirementDueDate] = useState("");
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedFormats, setSelectedFormats] = useState([".pdf"]);
  const [submissions, setSubmissions] = useState([]);
  const [userFilter, setUserFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [tempAssignments, setTempAssignments] = useState({});
  const [toast, setToast] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [activeReview, setActiveReview] = useState(null);
  const [newReviewName, setNewReviewName] = useState("");
  const [newReviewDescription, setNewReviewDescription] = useState("");
  const [newReviewDate, setNewReviewDate] = useState("");
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [editDeadline, setEditDeadline] = useState("");
  const [editingColumn, setEditingColumn] = useState(null);
  const [editColumnData, setEditColumnData] = useState({});
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [selectedSection, setSelectedSection] = useState("");
  const [templates, setTemplates] = useState([]);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editTemplateData, setEditTemplateData] = useState({});
  const [isEditUploading, setIsEditUploading] = useState(false);
  const [selectedTemplateFile, setSelectedTemplateFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});
  const [editingTeam, setEditingTeam] = useState(null);
  const [editTeamData, setEditTeamData] = useState({});
  const [reportPreview, setReportPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [selectedDashboardSection, setSelectedDashboardSection] = useState("");
  const [selectedSubmissionSection, setSelectedSubmissionSection] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const setLoading = (key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  };

  const isLoading = (key) => {
    return loadingStates[key] || false;
  };

  const loadReviews = async () => {
    try {
      const response = await fetch("/api/reviews");
      const reviewsData = await response.json();
      setReviews(reviewsData);
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const loadActiveReview = async () => {
    try {
      const response = await fetch("/api/reviews/active");
      const activeReviewData = await response.json();
      setActiveReview(activeReviewData);
    } catch (error) {
      console.error("Error loading active review:", error);
    }
  };

  const createReview = async () => {
    if (!newReviewName) {
      showToast("Please enter review name", "error");
      return;
    }

    setLoading("createReview", true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newReviewName,
          description: newReviewDescription,
          reviewDate: newReviewDate ? new Date(newReviewDate) : null,
        }),
      });

      if (response.ok) {
        await loadReviews();
        await loadActiveReview();
        await onDataChange(); // Reload columns for new active review
        setNewReviewName("");
        setNewReviewDescription("");
        setNewReviewDate("");
        showToast("Review created successfully!");
      } else {
        showToast("Error creating review", "error");
      }
    } catch (error) {
      showToast("Error creating review", "error");
    } finally {
      setLoading("createReview", false);
    }
  };

  const activateReview = async (reviewId) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/activate`, {
        method: "PUT",
      });

      if (response.ok) {
        await loadReviews();
        await loadActiveReview();
        await onDataChange(); // Reload columns for new active review
        showToast("Review activated successfully!");
      } else {
        showToast("Error activating review", "error");
      }
    } catch (error) {
      showToast("Error activating review", "error");
    }
  };

  const resetReviewData = async (reviewId, reviewName) => {
    if (
      window.confirm(
        `Are you sure you want to reset all data for "${reviewName}"? This action cannot be undone.`
      )
    ) {
      try {
        const response = await fetch(`/api/reviews/${reviewId}/reset`, {
          method: "DELETE",
        });

        if (response.ok) {
          showToast("Review data reset successfully!");
        } else {
          showToast("Error resetting review data", "error");
        }
      } catch (error) {
        showToast("Error resetting review data", "error");
      }
    }
  };

  const deleteUploadRequirement = async (requirementId) => {
    if (
      window.confirm("Are you sure you want to delete this upload requirement?")
    ) {
      try {
        const response = await fetch(
          `/api/upload-requirements/${requirementId}`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          await loadUploadRequirements();
          showToast("Upload requirement deleted successfully!");
        } else {
          showToast("Error deleting upload requirement", "error");
        }
      } catch (error) {
        showToast("Error deleting upload requirement", "error");
      }
    }
  };

  const updateRequirementDeadline = async (requirementId) => {
    try {
      const response = await fetch(
        `/api/upload-requirements/${requirementId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dueDate: editDeadline ? new Date(editDeadline) : null,
          }),
        }
      );

      if (response.ok) {
        await loadUploadRequirements();
        setEditingRequirement(null);
        setEditDeadline("");
        showToast("Deadline updated successfully!");
      } else {
        showToast("Error updating deadline", "error");
      }
    } catch (error) {
      showToast("Error updating deadline", "error");
    }
  };

  const deleteReview = async (reviewId, reviewName) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${reviewName}"? This will permanently remove the review and all its data.`
      )
    ) {
      try {
        const response = await fetch(`/api/reviews/${reviewId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await loadReviews();
          await loadActiveReview();
          showToast("Review deleted successfully!");
        } else {
          showToast("Error deleting review", "error");
        }
      } catch (error) {
        showToast("Error deleting review", "error");
      }
    }
  };

  const startEditColumn = (column) => {
    setEditingColumn(column.name);
    setEditColumnData({
      name: column.name,
      type: column.type,
      inputType: column.inputType,
      options: column.options?.join(", ") || "",
      maxMarks: column.maxMarks || "",
    });
  };

  const updateColumn = async () => {
    try {
      const columnData = {
        ...editColumnData,
        options:
          editColumnData.inputType === "options"
            ? editColumnData.options.split(",").map((opt) => opt.trim())
            : [],
        maxMarks: editColumnData.maxMarks
          ? parseInt(editColumnData.maxMarks)
          : null,
      };

      const response = await fetch(`/api/columns/${editingColumn}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(columnData),
      });

      if (response.ok) {
        await onDataChange();
        setEditingColumn(null);
        setEditColumnData({});
        showToast("Column updated successfully!");
      } else {
        showToast("Error updating column", "error");
      }
    } catch (error) {
      showToast("Error updating column", "error");
    }
  };

  const previewReport = (type, section = null) => {
    let data = { headers: [], rows: [] };
    let filteredTeams = teams;

    // Filter teams based on type
    if (type === "section" && section) {
      filteredTeams = teams.filter(
        (team) =>
          team.name.replace("Batch ", "").charAt(0).toUpperCase() === section
      );
    } else if (type === "batch" && section) {
      filteredTeams = teams.filter((team) => team.name === section);
    }

    if (type === "attendance") {
      data.headers = ["Team", "Roll No", "Member Name", "Status"];
      filteredTeams.forEach((team) => {
        data.rows.push([team.name, "", "", ""]); // Team header row
        const members = team.members.split(",").map((m) => m.trim());
        const isTeamSubmitted =
          activeReview && team.reviewData?.[activeReview._id]?._submittedBy;

        members.forEach((member) => {
          const rollMatch = member.match(/\(([^)]+)\)$/);
          const rollNo = rollMatch ? rollMatch[1] : "";
          const memberName = rollMatch
            ? member.replace(/\s*\([^)]+\)$/, "").trim()
            : member;

          let status = "";
          if (isTeamSubmitted) {
            const isAbsent =
              team.reviewData?.[activeReview._id]?._absentMembers?.[member];
            status = isAbsent ? "Absent" : "Present";
          }

          data.rows.push(["", rollNo, memberName, status]);
        });
      });
    } else if (type === "submissions") {
      data.headers = ["Team", "Requirement", "File", "Upload Date"];
      // This would need submissions data from backend
      data.rows.push(["No submission data available in preview", "", "", ""]);
    } else if (type === "review" && activeReview) {
      // Analytics for review report
      data.headers = ["Review Analytics", "Value"];

      let submittedCount = 0;
      let totalStudents = 0;
      let absentCount = 0;

      filteredTeams.forEach((team) => {
        const members = team.members.split(",").map((m) => m.trim());
        totalStudents += members.length;

        if (team.reviewData?.[activeReview._id]?._submittedBy) {
          submittedCount++;
        }

        members.forEach((member) => {
          if (team.reviewData?.[activeReview._id]?._absentMembers?.[member]) {
            absentCount++;
          }
        });
      });

      data.rows.push(["Review Name", activeReview.name]);
      data.rows.push(["Description", activeReview.description || "N/A"]);
      if (activeReview.reviewDate) {
        data.rows.push([
          "Review Date",
          new Date(activeReview.reviewDate).toLocaleDateString(),
        ]);
      }
      data.rows.push(["Total Teams", filteredTeams.length]);
      data.rows.push(["Teams with Scoring Submitted", submittedCount]);
      data.rows.push([
        "Teams with Scoring Pending",
        filteredTeams.length - submittedCount,
      ]);
      data.rows.push(["Total Students", totalStudents]);
      data.rows.push(["Students Absent", absentCount]);

      // Column analytics
      if (customColumns.length > 0) {
        data.rows.push(["", ""]);
        data.rows.push(["Column Analytics", ""]);

        customColumns.forEach((col) => {
          if (col.inputType === "number") {
            let scores = [];

            filteredTeams.forEach((team) => {
              if (col.type === "team") {
                const value = team.reviewData?.[activeReview._id]?.[col.name];
                if (value && !isNaN(parseFloat(value))) {
                  scores.push(parseFloat(value));
                }
              } else {
                const members = team.members.split(",").map((m) => m.trim());
                members.forEach((member) => {
                  const value =
                    team.reviewData?.[activeReview._id]?.[col.name]?.[member];
                  if (value && !isNaN(parseFloat(value))) {
                    scores.push(parseFloat(value));
                  }
                });
              }
            });

            if (scores.length > 0) {
              const avg = (
                scores.reduce((a, b) => a + b, 0) / scores.length
              ).toFixed(2);
              const max = Math.max(...scores);
              const min = Math.min(...scores);
              data.rows.push([
                `${col.name} (Avg/Max/Min)`,
                `${avg}/${col.maxMarks}/${min}`,
              ]);
            } else {
              data.rows.push([`${col.name}`, "No data"]);
            }
          }
        });
      }
    } else {
      // Score reports with hierarchical format
      data.headers = [
        "Batch Name",
        "Roll No",
        "Member Name",
        "Project Title",
        "Guide",
      ];
      customColumns.forEach((col) => {
        data.headers.push(col.name);
      });
      data.headers.push("Total", "Reviewers");

      filteredTeams.forEach((team) => {
        const members = team.members.split(",").map((m) => m.trim());

        // Team header row
        const submittedByUsername =
          activeReview && team.reviewData?.[activeReview._id]?._submittedBy;
        let submittedBy = "Not submitted";
        if (submittedByUsername) {
          const reviewer = users.find(
            (u) => u.username === submittedByUsername
          );
          submittedBy = reviewer
            ? reviewer.name || submittedByUsername
            : submittedByUsername;
        }

        const teamRow = [
          team.name,
          "",
          "",
          team.projectTitle || "",
          team.guide || "",
        ];
        customColumns.forEach((col) => {
          if (col.type === "team") {
            let value =
              (activeReview &&
                team.reviewData?.[activeReview._id]?.[col.name]) ||
              team[col.name] ||
              "";
            if (
              !value &&
              col.inputType === "options" &&
              col.options &&
              col.options.length > 0
            ) {
              value = col.options[0];
            }
            teamRow.push(String(value));
          } else {
            teamRow.push(""); // Empty for individual columns at team level
          }
        });
        teamRow.push("", submittedBy); // Empty total, then submitting reviewer for team row
        data.rows.push(teamRow);

        // Member rows (indented)
        members.forEach((member) => {
          // Extract name and roll number
          const rollMatch = member.match(/\(([^)]+)\)$/);
          const rollNo = rollMatch ? rollMatch[1] : "";
          const memberName = rollMatch
            ? member.replace(/\s*\([^)]+\)$/, "").trim()
            : member;

          const memberRow = [team.name, rollNo, memberName, "", ""]; // Batch name, roll no, member name, project title, guide
          const isAbsent =
            activeReview &&
            team.reviewData?.[activeReview._id]?._absentMembers?.[member];
          let total = 0;

          customColumns.forEach((col) => {
            if (col.type === "individual") {
              if (isAbsent) {
                memberRow.push("Absent");
              } else {
                let value =
                  (activeReview &&
                    team.reviewData?.[activeReview._id]?.[col.name]?.[
                      member
                    ]) ||
                  team[col.name]?.[member] ||
                  "";
                if (
                  !value &&
                  col.inputType === "options" &&
                  col.options &&
                  col.options.length > 0
                ) {
                  value = col.options[0];
                }
                // Add to total if it's a number
                if (
                  col.inputType === "number" &&
                  value &&
                  !isNaN(parseFloat(value))
                ) {
                  total += parseFloat(value);
                }
                memberRow.push(String(value));
              }
            } else {
              memberRow.push(""); // Empty for team columns at member level
            }
          });

          // Add total score and empty reviewers column
          memberRow.push(isAbsent ? "Absent" : String(total), "");
          data.rows.push(memberRow);
        });

        // Add empty row between teams
        data.rows.push([
          "",
          "",
          "",
          "",
          ...Array(customColumns.length + 2).fill(""),
        ]);
      });
    }

    setReportPreview({ type, section, data });
    setShowPreview(true);
  };

  const downloadReport = async (type, section = null) => {
    try {
      const params = new URLSearchParams({ type });
      if (section) params.append("section", section);

      const response = await fetch(`/api/reports?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const reviewPrefix = activeReview
          ? `${activeReview.name.replace(/\s+/g, "_")}_`
          : "";
        a.download = `${reviewPrefix}${type}_report_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast("Report downloaded successfully!");
      } else {
        showToast("Error downloading report", "error");
      }
    } catch (error) {
      showToast("Error downloading report", "error");
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const usersData = await response.json();
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadUploadRequirements = async () => {
    try {
      const response = await fetch("/api/upload-requirements");
      const requirementsData = await response.json();
      setUploadRequirements(requirementsData);
    } catch (error) {
      console.error("Error loading upload requirements:", error);
    }
  };

  const loadSubmissions = async () => {
    try {
      const response = await fetch("/api/submissions");
      const submissionsData = await response.json();
      setSubmissions(submissionsData);
    } catch (error) {
      console.error("Error loading submissions:", error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch("/api/templates");
      const templatesData = await response.json();
      setTemplates(templatesData);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const handleTemplateFileSelect = (event) => {
    setSelectedTemplateFile(event.target.files[0]);
  };

  const uploadTemplate = async () => {
    if (!selectedTemplateFile || !newTemplateTitle) {
      showToast("Please enter title and select file", "error");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedTemplateFile);
    formData.append("title", newTemplateTitle);
    formData.append("description", newTemplateDescription);

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await loadTemplates();
        setNewTemplateTitle("");
        setNewTemplateDescription("");
        setSelectedTemplateFile(null);
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = "";
        showToast("Template uploaded successfully!");
      } else {
        showToast("Error uploading template", "error");
      }
    } catch (error) {
      showToast("Error uploading template", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      try {
        const response = await fetch(`/api/templates/${templateId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await loadTemplates();
          showToast("Template deleted successfully!");
        } else {
          showToast("Error deleting template", "error");
        }
      } catch (error) {
        showToast("Error deleting template", "error");
      }
    }
  };

  const startEditTemplate = (template) => {
    setEditingTemplate(template._id);
    setEditTemplateData({
      title: template.title,
      description: template.description || "",
      selectedFile: null,
    });
  };

  const updateTemplate = async (templateId, file = null) => {
    setIsEditUploading(true);
    const formData = new FormData();
    formData.append("title", editTemplateData.title);
    formData.append("description", editTemplateData.description);
    if (file) {
      formData.append("file", file);
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        await loadTemplates();
        setEditingTemplate(null);
        setEditTemplateData({});
        showToast("Template updated successfully!");
      } else {
        showToast("Error updating template", "error");
      }
    } catch (error) {
      showToast("Error updating template", "error");
    } finally {
      setIsEditUploading(false);
    }
  };

  const startEditTeam = (team) => {
    setEditingTeam(team._id);
    setEditTeamData({
      name: team.name,
      members: team.members.split(",").map((m) => m.trim()),
      projectTitle: team.projectTitle || "",
      guide: team.guide || "",
    });
  };

  const addMember = () => {
    setEditTeamData({
      ...editTeamData,
      members: [...editTeamData.members, ""],
    });
  };

  const removeMember = (index) => {
    setEditTeamData({
      ...editTeamData,
      members: editTeamData.members.filter((_, i) => i !== index),
    });
  };

  const updateMember = (index, value) => {
    const newMembers = [...editTeamData.members];
    newMembers[index] = value;
    setEditTeamData({
      ...editTeamData,
      members: newMembers,
    });
  };

  const updateTeam = async () => {
    if (
      !editTeamData.name ||
      !editTeamData.members.length ||
      editTeamData.members.some((m) => !m.trim())
    ) {
      showToast("Please fill in team name and all member names", "error");
      return;
    }

    setLoading("updateTeam", true);
    try {
      const response = await fetch(`/api/teams/${editingTeam}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editTeamData,
          members: editTeamData.members.join(", "),
          isBasicUpdate: true,
        }),
      });

      if (response.ok) {
        await onDataChange();
        setEditingTeam(null);
        setEditTeamData({});
        showToast("Team updated successfully!");
      } else {
        showToast("Error updating team", "error");
      }
    } catch (error) {
      showToast("Error updating team", "error");
    } finally {
      setLoading("updateTeam", false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadUploadRequirements();
    loadSubmissions();
    loadReviews();
    loadActiveReview();
    loadTemplates();
  }, []);

  const addColumn = async () => {
    if (!columnName) {
      showToast("Please enter a column name", "error");
      return;
    }

    if (inputType === "options" && !options.trim()) {
      showToast("Please enter options for dropdown", "error");
      return;
    }

    if (customColumns.find((col) => col.name === columnName)) {
      showToast("Column already exists", "error");
      return;
    }

    setLoading("addColumn", true);
    try {
      const columnData = {
        name: columnName,
        type: columnType,
        inputType: inputType,
        options:
          inputType === "options"
            ? options.split(",").map((opt) => opt.trim())
            : [],
        maxMarks: maxMarks ? parseInt(maxMarks) : null,
      };

      const response = await fetch("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(columnData),
      });

      if (response.ok) {
        await onDataChange();
        setColumnName("");
        setOptions("");
        setMaxMarks("");
        showToast("Column added successfully!");
      } else {
        showToast("Error adding column", "error");
      }
    } catch (error) {
      showToast("Error adding column", "error");
    } finally {
      setLoading("addColumn", false);
    }
  };

  const addTeam = async () => {
    if (!teamName || !teamMembers) {
      showToast("Please fill in both team name and members", "error");
      return;
    }

    setLoading("addTeam", true);
    const newTeam = {
      name: teamName,
      members: teamMembers,
    };

    customColumns.forEach((col) => {
      if (col.type === "individual") {
        const members = teamMembers.split(",").map((m) => m.trim());
        newTeam[col.name] = {};
        members.forEach((member) => {
          newTeam[col.name][member] = "";
        });
      } else {
        newTeam[col.name] = "";
      }
    });

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTeam),
      });

      if (response.ok) {
        await onDataChange();
        setTeamName("");
        setTeamMembers("");
        showToast("Team added successfully!");
      } else {
        showToast("Error adding team", "error");
      }
    } catch (error) {
      showToast("Error adding team", "error");
    } finally {
      setLoading("addTeam", false);
    }
  };

  const addUser = async () => {
    if (!newUsername || !newPassword || !newName) {
      showToast("Please fill in username, password, and name", "error");
      return;
    }

    setLoading("addUser", true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          name: newName,
          role: newUserRole,
          assignedSections: (newUserRole === "viewer" || newUserRole === "head") ? [] : assignedSections
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
        }),
      });

      if (response.ok) {
        await loadUsers();
        setNewUsername("");
        setNewPassword("");
        setNewName("");
        setNewUserRole("reviewer");
        setAssignedSections("");
        showToast("User added successfully!");
      } else {
        showToast("Error adding user", "error");
      }
    } catch (error) {
      showToast("Error adding user", "error");
    } finally {
      setLoading("addUser", false);
    }
  };

  const addUploadRequirement = async () => {
    if (!newRequirementTitle || !newRequirementDescription) {
      showToast("Please fill in title and description", "error");
      return;
    }

    setLoading("addUploadRequirement", true);
    try {
      const response = await fetch("/api/upload-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newRequirementTitle,
          description: newRequirementDescription,
          dueDate: newRequirementDueDate
            ? new Date(newRequirementDueDate)
            : null,
          sections: selectedSections,
          allowedFormats: selectedFormats,
        }),
      });

      if (response.ok) {
        await loadUploadRequirements();
        setNewRequirementTitle("");
        setNewRequirementDescription("");
        setNewRequirementDueDate("");
        setSelectedSections([]);
        setSelectedFormats([".pdf"]);
        showToast("Upload requirement added successfully!");
      } else {
        showToast("Error adding upload requirement", "error");
      }
    } catch (error) {
      showToast("Error adding upload requirement", "error");
    } finally {
      setLoading("addUploadRequirement", false);
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await loadUsers();
          showToast("User deleted successfully!");
        } else {
          showToast("Error deleting user", "error");
        }
      } catch (error) {
        showToast("Error deleting user", "error");
      }
    }
  };

  const updateUserSections = async (userId) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedSections: tempAssignments[userId] || [],
        }),
      });

      if (response.ok) {
        await loadUsers();
        setEditingUser(null);
        setTempAssignments({});
        showToast("Assignments updated successfully!");
      }
    } catch (error) {
      showToast("Error updating assignments", "error");
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        await loadUsers();
        showToast("User role updated successfully!");
      } else {
        showToast("Error updating user role", "error");
      }
    } catch (error) {
      showToast("Error updating user role", "error");
    }
  };

  const handleAssignmentChange = (userId, assignment, checked) => {
    const current =
      tempAssignments[userId] || editingUser?.assignedSections || [];
    const updated = checked
      ? [...current, assignment]
      : current.filter((s) => s !== assignment);
    setTempAssignments((prev) => ({ ...prev, [userId]: updated }));
  };

  const reorderColumns = async (fromIndex, toIndex) => {
    const reorderedColumns = [...customColumns];
    const [movedColumn] = reorderedColumns.splice(fromIndex, 1);
    reorderedColumns.splice(toIndex, 0, movedColumn);

    try {
      for (let i = 0; i < reorderedColumns.length; i++) {
        const col = reorderedColumns[i];
        await fetch(`/api/columns/${col.name}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...col, order: i }),
        });
      }
      await onDataChange();
    } catch (error) {
      showToast("Error reordering columns", "error");
    }
  };

  const removeColumn = async () => {
    if (!removeColumnSelect) {
      showToast("Please select a column to remove", "error");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to remove the "${removeColumnSelect}" column?`
      )
    ) {
      try {
        const response = await fetch(`/api/columns/${removeColumnSelect}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await onDataChange();
          setRemoveColumnSelect("");
          showToast("Column removed successfully!");
        } else {
          showToast("Error removing column", "error");
        }
      } catch (error) {
        showToast("Error removing column", "error");
      }
    }
  };

  const getTeamSections = () => {
    const sections = new Set();
    teams.forEach((team) => {
      const sectionLetter = team.name
        .replace("Batch ", "")
        .charAt(0)
        .toUpperCase();
      sections.add(sectionLetter);
    });
    return Array.from(sections).sort();
  };

  const filteredTeams =
    filterSection === "All"
      ? teams
      : teams.filter(
          (team) =>
            team.name.replace("Batch ", "").charAt(0).toUpperCase() ===
            filterSection
        );

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const sessionId = Date.now().toString();
    setIsImporting(true);
    setImportProgress({
      progress: 0,
      message: "Starting import...",
      step: "init",
    });

    // Start SSE connection for progress updates
    const eventSource = new EventSource(`/api/import-progress/${sessionId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "progress") {
        setImportProgress({
          progress: data.progress,
          message: data.message,
          step: data.step,
        });
      } else if (data.type === "error") {
        setImportProgress({
          progress: 0,
          message: data.message,
          step: "error",
        });
        showToast(`Import failed: ${data.message}`, "error");
        setIsImporting(false);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    const formData = new FormData();
    formData.append("excelFile", file);
    formData.append("sessionId", sessionId);

    try {
      const response = await fetch("/api/import-excel", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        showToast(`Successfully imported ${result.teams.length} teams!`);
        await onDataChange();
        event.target.value = "";

        // Final progress update
        setImportProgress({
          progress: 100,
          message: `Import completed! Created ${result.teams.length} teams`,
          step: "complete",
        });

        // Hide progress after delay
        setTimeout(() => {
          setImportProgress(null);
          setIsImporting(false);
        }, 3000);
      } else {
        const error = await response.json();
        showToast(`Import failed: ${error.error}`, "error");
        setImportProgress(null);
        setIsImporting(false);
      }

      eventSource.close();
    } catch (error) {
      showToast("Error importing file", "error");
      setImportProgress(null);
      setIsImporting(false);
      eventSource.close();
    }
  };

  const sendLoginDetailsToAll = async () => {
    if (
      !window.confirm(
        "Send login details to all team members? This will send emails to all students."
      )
    ) {
      return;
    }

    setIsSendingEmails(true);
    try {
      const response = await fetch("/api/email/send-login-details", {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        showToast(
          `Emails sent to ${result.results.length} teams successfully!`
        );
      } else {
        showToast("Error sending emails", "error");
      }
    } catch (error) {
      showToast("Error sending emails", "error");
    } finally {
      setIsSendingEmails(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Analytics Dashboard
            </h3>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Teams</p>
                    <p className="text-3xl font-bold">{teams.length}</p>
                  </div>
                  <FaUsers className="text-4xl text-blue-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total Students</p>
                    <p className="text-3xl font-bold">
                      {teams.reduce((total, team) => total + team.members.split(',').length, 0)}
                    </p>
                  </div>
                  <FaUserFriends className="text-4xl text-green-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Active Review</p>
                    <p className="text-lg font-bold">
                      {activeReview ? activeReview.name : 'None'}
                    </p>
                  </div>
                  <FaClipboardList className="text-4xl text-purple-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Submissions</p>
                    <p className="text-3xl font-bold">{submissions.length}</p>
                  </div>
                  <FaUpload className="text-4xl text-orange-200" />
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Review Status Pie Chart */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-700">Review Status</h4>
                  <select
                    value={selectedDashboardSection || getTeamSections()[0] || ""}
                    onChange={(e) => setSelectedDashboardSection(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {getTeamSections().map(section => (
                      <option key={section} value={section}>Section {section}</option>
                    ))}
                  </select>
                </div>
                {activeReview ? (() => {
                  const currentSection = selectedDashboardSection || getTeamSections()[0];
                  const filteredTeams = teams.filter(team => 
                    team.name.replace('Batch ', '').charAt(0).toUpperCase() === currentSection
                  );
                  
                  const completedTeams = filteredTeams.filter(team => 
                    team.reviewData?.[activeReview._id]?._submittedBy
                  ).length;
                  const pendingTeams = filteredTeams.length - completedTeams;
                  const completedPercentage = filteredTeams.length > 0 ? (completedTeams / filteredTeams.length) * 100 : 0;
                  const pendingPercentage = 100 - completedPercentage;
                  
                  return (
                    <div className="flex items-center justify-center">
                      <div className="relative w-40 h-40">
                        <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 42 42">
                          <circle
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke="#ef4444"
                            strokeWidth="3"
                            strokeDasharray={`${pendingPercentage} ${100 - pendingPercentage}`}
                            strokeDashoffset="25"
                          />
                          <circle
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke="#22c55e"
                            strokeWidth="3"
                            strokeDasharray={`${completedPercentage} ${100 - completedPercentage}`}
                            strokeDashoffset={`${25 - pendingPercentage}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-800">{completedPercentage.toFixed(1)}%</div>
                            <div className="text-xs text-gray-600">Complete</div>
                          </div>
                        </div>
                      </div>
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                          <span className="text-sm text-gray-700">Completed: {completedTeams}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                          <span className="text-sm text-gray-700">Pending: {pendingTeams}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Total: {filteredTeams.length} teams
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="text-center text-gray-500 py-8">
                    <FaInfoCircle className="text-4xl mb-2 mx-auto" />
                    <p>No active review</p>
                  </div>
                )}
              </div>

              {/* Submissions Status Pie Chart */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-700">Submissions Status</h4>
                  <select
                    value={selectedSubmissionSection || getTeamSections()[0] || ""}
                    onChange={(e) => setSelectedSubmissionSection(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {getTeamSections().map(section => (
                      <option key={section} value={section}>Section {section}</option>
                    ))}
                  </select>
                </div>
                {uploadRequirements.length > 0 ? (() => {
                  const currentSection = selectedSubmissionSection || getTeamSections()[0];
                  const filteredTeams = teams.filter(team => 
                    team.name.replace('Batch ', '').charAt(0).toUpperCase() === currentSection
                  );
                  
                  const teamsWithSubmissions = filteredTeams.filter(team => 
                    submissions.some(sub => sub.batchName === team.name)
                  ).length;
                  const teamsWithoutSubmissions = filteredTeams.length - teamsWithSubmissions;
                  const submittedPercentage = filteredTeams.length > 0 ? (teamsWithSubmissions / filteredTeams.length) * 100 : 0;
                  const pendingPercentage = 100 - submittedPercentage;
                  
                  return (
                    <div className="flex items-center justify-center">
                      <div className="relative w-40 h-40">
                        <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 42 42">
                          <circle
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke="#f59e0b"
                            strokeWidth="3"
                            strokeDasharray={`${pendingPercentage} ${100 - pendingPercentage}`}
                            strokeDashoffset="25"
                          />
                          <circle
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            strokeDasharray={`${submittedPercentage} ${100 - submittedPercentage}`}
                            strokeDashoffset={`${25 - pendingPercentage}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-800">{submittedPercentage.toFixed(1)}%</div>
                            <div className="text-xs text-gray-600">Submitted</div>
                          </div>
                        </div>
                      </div>
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                          <span className="text-sm text-gray-700">Submitted: {teamsWithSubmissions}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                          <span className="text-sm text-gray-700">Pending: {teamsWithoutSubmissions}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Total: {filteredTeams.length} teams
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="text-center text-gray-500 py-8">
                    <FaInfoCircle className="text-4xl mb-2 mx-auto" />
                    <p>No upload requirements</p>
                  </div>
                )}
              </div>
            </div>

            {/* Score Analytics */}
            {activeReview && customColumns.filter(col => col.inputType === 'number').length > 0 && (
              <div className="bg-gray-50 p-6 rounded-lg mb-8">
                <h4 className="text-lg font-semibold text-gray-700 mb-4">Score Analytics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customColumns.filter(col => col.inputType === 'number').map(column => {
                    const scores = [];
                    teams.forEach(team => {
                      if (column.type === 'team') {
                        const value = team.reviewData?.[activeReview._id]?.[column.name];
                        if (value && !isNaN(parseFloat(value))) {
                          scores.push(parseFloat(value));
                        }
                      } else {
                        const members = team.members.split(',').map(m => m.trim());
                        members.forEach(member => {
                          const value = team.reviewData?.[activeReview._id]?.[column.name]?.[member];
                          if (value && !isNaN(parseFloat(value))) {
                            scores.push(parseFloat(value));
                          }
                        });
                      }
                    });
                    
                    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
                    const max = scores.length > 0 ? Math.max(...scores) : 0;
                    const min = scores.length > 0 ? Math.min(...scores) : 0;
                    
                    return (
                      <div key={column.name} className="bg-white p-4 rounded-lg border">
                        <h5 className="font-medium text-gray-800 mb-2">{column.name}</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Average:</span>
                            <span className="font-medium">{avg}{column.maxMarks ? `/${column.maxMarks}` : ''}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Highest:</span>
                            <span className="font-medium text-green-600">{max}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Lowest:</span>
                            <span className="font-medium text-red-600">{min}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Entries:</span>
                            <span className="font-medium">{scores.length}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">Recent Activity</h4>
              <div className="space-y-3">
                {submissions.slice(-5).reverse().map(submission => (
                  <div key={submission._id} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <FaUpload className="text-blue-600 text-sm" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {submission.batchName} uploaded {submission.requirementId?.title || 'file'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(submission.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Completed
                    </span>
                  </div>
                ))}
                {submissions.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <FaInfoCircle className="text-4xl mb-2 mx-auto" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "team-management":
        return (
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Team Management
            </h3>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Add New Team
              </h4>
              <div className="flex flex-wrap gap-4">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Team Name"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={teamMembers}
                  onChange={(e) => setTeamMembers(e.target.value)}
                  placeholder="Team Members (comma separated)"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1"
                />
                <button
                  onClick={addTeam}
                  disabled={isLoading("addTeam")}
                  className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    isLoading("addTeam")
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isLoading("addTeam") ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <FaPlus /> Add Team
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* <div className="bg-blue-50 p-6 rounded-lg mb-6 border-l-4 border-blue-500">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Send Login Details
              </h4>
              <button
                onClick={sendLoginDetailsToAll}
                disabled={isSendingEmails}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isSendingEmails
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isSendingEmails ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending Emails...
                  </>
                ) : (
                  <>
                    📧 Send Login Details to All Teams
                  </>
                )}
              </button>
              <p className="text-xs text-gray-600 mt-2 italic">
                This will send login credentials to all team members via email
              </p>
            </div> */}

            <div className="bg-green-50 p-6 rounded-lg mb-6 border-l-4 border-green-500">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Import Teams from Excel
              </h4>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isImporting}
                className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
                  isImporting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              />
              <p className="text-xs text-gray-600 mt-2 italic">
                Excel should have: "Batch No.", "Student Name", "Roll No.",
                "Project Title", "Guide"
              </p>

              {/* Progress Bar */}
              {importProgress && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {importProgress.message}
                    </span>
                    <span className="text-sm text-gray-500">
                      {importProgress.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        importProgress.step === "error"
                          ? "bg-red-500"
                          : importProgress.step === "complete"
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${importProgress.progress}%` }}
                    ></div>
                  </div>
                  {importProgress.step === "complete" && (
                    <div className="flex items-center mt-2 text-green-600">
                      <FaCheck className="mr-2" />
                      <span className="text-sm font-medium">
                        Import completed successfully!
                      </span>
                    </div>
                  )}
                  {importProgress.step === "error" && (
                    <div className="flex items-center mt-2 text-red-600">
                      <FaTimes className="mr-2" />
                      <span className="text-sm font-medium">Import failed</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Team List
              </h4>
              <div className="space-y-3">
                {teams
                  .sort((a, b) => {
                    // Natural sort for team names with numbers
                    const aName = a.name.replace(/Batch\s+/i, "");
                    const bName = b.name.replace(/Batch\s+/i, "");
                    return aName.localeCompare(bName, undefined, {
                      numeric: true,
                      sensitivity: "base",
                    });
                  })
                  .map((team) => (
                    <div
                      key={team._id}
                      className="bg-white p-4 rounded-lg border border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-semibold text-gray-800">
                            {team.name}
                          </h5>
                          <p className="text-gray-600 text-sm mt-1">
                            Members: {team.members.split(",").length}
                          </p>
                          {team.projectTitle && (
                            <p className="text-gray-600 text-sm">
                              Project: {team.projectTitle}
                            </p>
                          )}
                          {team.guide && (
                            <p className="text-gray-600 text-sm">
                              Guide: {team.guide}
                            </p>
                          )}
                          <div className="mt-2">
                            {activeReview &&
                            team.reviewData?.[activeReview._id]
                              ?._scoringLocked ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <FaLock className="mr-1" /> Scoring Locked
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <FaUnlock className="mr-1" /> Scoring Unlocked
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {activeReview &&
                            team.reviewData?.[activeReview._id]
                              ?._scoringLocked && (
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch(
                                      `/api/teams/${team._id}/unlock-scoring`,
                                      {
                                        method: "PUT",
                                      }
                                    );
                                    if (response.ok) {
                                      await onDataChange();
                                      showToast(
                                        "Team scoring unlocked successfully!"
                                      );
                                    } else {
                                      showToast(
                                        "Error unlocking scoring",
                                        "error"
                                      );
                                    }
                                  } catch (error) {
                                    showToast(
                                      "Error unlocking scoring",
                                      "error"
                                    );
                                  }
                                }}
                                className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm flex items-center gap-1"
                              >
                                <FaUnlock /> Unlock
                              </button>
                            )}
                          {/* <button
                          onClick={async () => {
                            if (window.confirm(`Send login details to ${team.name} members?`)) {
                              try {
                                const response = await fetch(`/api/email/send-login-details/${team._id}`, {
                                  method: 'POST'
                                });
                                if (response.ok) {
                                  showToast(`Login details sent to ${team.name}!`);
                                } else {
                                  showToast('Error sending emails', 'error');
                                }
                              } catch (error) {
                                showToast('Error sending emails', 'error');
                              }
                            }
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                        >
                          📧 Email
                        </button> */}
                          <button
                            onClick={() => startEditTeam(team)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this team?"
                                )
                              ) {
                                fetch(`/api/teams/${team._id}`, {
                                  method: "DELETE",
                                })
                                  .then(() => {
                                    onDataChange();
                                    showToast("Team deleted successfully!");
                                  })
                                  .catch(() =>
                                    showToast("Error deleting team", "error")
                                  );
                              }
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                {teams.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No teams created yet. Add teams manually or import from
                    Excel.
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case "teams-overview":
        return (
          <TeamsTable
            getTeamSections={getTeamSections}
            filterSection={filterSection}
            setFilterSection={setFilterSection}
            teams={filteredTeams}
            customColumns={customColumns}
            isHead={true}
            onDataChange={onDataChange}
            currentUser={currentUser}
          />
        );

      case "columns":
        return (
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Column Management
            </h3>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <div className="flex items-center">
                <FaInfoCircle className="text-blue-600 text-xl mr-3" />
                <div>
                  <h4 className="text-lg font-semibold text-blue-800">
                    Active Review: {activeReview ? activeReview.name : "None"}
                  </h4>
                  <p className="text-blue-700 mt-1">
                    {activeReview
                      ? "Columns are specific to this review. Switch reviews to manage different column sets."
                      : "No active review. Create and activate a review to add columns."}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Add New Column
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <input
                  type="text"
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="Column Name (e.g., Marks, Grade)"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={columnType}
                  onChange={(e) => setColumnType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="team">Combined for Team</option>
                  <option value="individual">Separate for Each Member</option>
                </select>
                <select
                  value={inputType}
                  onChange={(e) => setInputType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="text">Text Input</option>
                  <option value="number">Number Input</option>
                  <option value="textarea">Long Text (Remarks)</option>
                  <option value="options">Dropdown Options</option>
                </select>
                <input
                  type="number"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  placeholder="Max Marks (optional)"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addColumn}
                  disabled={isLoading("addColumn")}
                  className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    isLoading("addColumn")
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {isLoading("addColumn") ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <FaPlus /> Add Column
                    </>
                  )}
                </button>
              </div>
              {inputType === "options" && (
                <input
                  type="text"
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder="Options (comma separated)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Reorder Columns (Drag & Drop)
              </h4>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-white">
                {customColumns.map((col, index) => (
                  <div
                    key={col.name}
                    className={`p-3 mb-2 border rounded-lg transition-colors ${
                      draggedColumn === index
                        ? "bg-gray-100 border-blue-400"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {editingColumn === col.name ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editColumnData.name}
                            onChange={(e) =>
                              setEditColumnData({
                                ...editColumnData,
                                name: e.target.value,
                              })
                            }
                            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Column Name"
                          />
                          <select
                            value={editColumnData.type}
                            onChange={(e) =>
                              setEditColumnData({
                                ...editColumnData,
                                type: e.target.value,
                              })
                            }
                            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="team">Combined for Team</option>
                            <option value="individual">
                              Separate for Each Member
                            </option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <select
                            value={editColumnData.inputType}
                            onChange={(e) =>
                              setEditColumnData({
                                ...editColumnData,
                                inputType: e.target.value,
                              })
                            }
                            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="text">Text Input</option>
                            <option value="number">Number Input</option>
                            <option value="textarea">
                              Long Text (Remarks)
                            </option>
                            <option value="options">Dropdown Options</option>
                          </select>
                          <input
                            type="number"
                            value={editColumnData.maxMarks}
                            onChange={(e) =>
                              setEditColumnData({
                                ...editColumnData,
                                maxMarks: e.target.value,
                              })
                            }
                            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Max Marks"
                          />
                        </div>
                        {editColumnData.inputType === "options" && (
                          <input
                            type="text"
                            value={editColumnData.options}
                            onChange={(e) =>
                              setEditColumnData({
                                ...editColumnData,
                                options: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Options (comma separated)"
                          />
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={updateColumn}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingColumn(null);
                              setEditColumnData({});
                            }}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-between cursor-move"
                        draggable
                        onDragStart={() => setDraggedColumn(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (
                            draggedColumn !== null &&
                            draggedColumn !== index
                          ) {
                            reorderColumns(draggedColumn, index);
                          }
                          setDraggedColumn(null);
                        }}
                      >
                        <span className="text-gray-700">
                          📋 {col.name} ({col.type}) - {col.inputType}
                          {col.maxMarks && ` - Max: ${col.maxMarks}`}
                        </span>
                        <button
                          onClick={() => startEditColumn(col)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Remove Column
              </h4>
              <div className="flex gap-4">
                <select
                  value={removeColumnSelect}
                  onChange={(e) => setRemoveColumnSelect(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select column to remove</option>
                  {customColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.type}) - {col.inputType}
                    </option>
                  ))}
                </select>
                <button
                  onClick={removeColumn}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <FaTrash /> Remove Column
                </button>
              </div>
            </div>
          </div>
        );

      case "users":
        return (
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              User Management
            </h3>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Add New User
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full Name"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={newUserRole || "reviewer"}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="reviewer">Reviewer</option>
                  <option value="viewer">Viewer</option>
                  <option value="head">Head</option>
                </select>
                <input
                  type="text"
                  value={assignedSections}
                  onChange={(e) => setAssignedSections(e.target.value)}
                  placeholder="Assigned Sections (A,B,C)"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={newUserRole === "viewer" || newUserRole === "head"}
                />
              </div>
              <button
                onClick={addUser}
                disabled={isLoading("addUser")}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isLoading("addUser")
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isLoading("addUser") ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <FaPlus /> Add User
                  </>
                )}
              </button>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <div className="flex items-center">
                <span className="text-blue-600 text-xl mr-3">ℹ️</span>
                <div>
                  <h4 className="text-lg font-semibold text-blue-800">
                    Student Accounts
                  </h4>
                  <p className="text-blue-700 mt-1">
                    Student accounts are automatically created when teams are
                    added. Username: batch name (e.g., batch_a1) | Password:
                    std@batch_name
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-gray-700">
                  Reviewers:
                </h4>
              </div>
              <div className="space-y-3">
                {users
                  .filter((u) => u.role !== "student")
                  .map((user) => (
                    <div
                      key={user._id}
                      className="p-4 bg-white rounded-lg border border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-gray-700 font-medium">
                              {user.name || user.username}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({user.username})
                            </span>
                            <select
                              value={user.role || "reviewer"}
                              onChange={(e) => updateUserRole(user._id, e.target.value)}
                              className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="reviewer">Reviewer</option>
                              <option value="viewer">Viewer</option>
                              <option value="head">Head</option>
                            </select>
                          </div>
                          <div className="text-sm text-gray-600">
                            Sections:{" "}
                            {user.assignedSections?.join(", ") || "None"}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteUser(user._id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-1"
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                      {(user.role === "reviewer" || !user.role) && (
                        <div className="mt-3 pt-3 border-t">
                          {editingUser?._id === user._id ? (
                            <div>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Sections
                                  </label>
                                  <div className="space-y-2">
                                    {getTeamSections().map((section) => (
                                      <label
                                        key={section}
                                        className="flex items-center"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={(
                                            tempAssignments[user._id] ||
                                            user.assignedSections ||
                                            []
                                          ).includes(section)}
                                          onChange={(e) =>
                                            handleAssignmentChange(
                                              user._id,
                                              section,
                                              e.target.checked
                                            )
                                          }
                                          className="mr-2"
                                        />
                                        <span className="text-sm">
                                          Section {section}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Specific Batches
                                  </label>
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {teams.map((team) => (
                                      <label
                                        key={team.name}
                                        className="flex items-center"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={(
                                            tempAssignments[user._id] ||
                                            user.assignedSections ||
                                            []
                                          ).includes(team.name)}
                                          onChange={(e) =>
                                            handleAssignmentChange(
                                              user._id,
                                              team.name,
                                              e.target.checked
                                            )
                                          }
                                          className="mr-2"
                                        />
                                        <span className="text-sm">
                                          {team.name}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateUserSections(user._id)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                >
                                  Save Changes
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUser(null);
                                    setTempAssignments({});
                                  }}
                                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingUser(user)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Edit Assignments
                            </button>
                          )}
                        </div>
                      )}
                      {user.role === "viewer" && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-gray-500 italic">
                            Viewers can only see data, no assignments needed.
                          </p>
                        </div>
                      )}
                      {user.role === "head" && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-gray-500 italic">
                            Heads have full access to all data and features.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        );

      case "uploads":
        return (
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Upload Requirements
            </h3>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Add New Upload Requirement
              </h4>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newRequirementTitle}
                  onChange={(e) => setNewRequirementTitle(e.target.value)}
                  placeholder="Title (e.g., Abstract, PPT, Report)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <textarea
                  value={newRequirementDescription}
                  onChange={(e) => setNewRequirementDescription(e.target.value)}
                  placeholder="Description and instructions"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                />
                <input
                  type="date"
                  value={newRequirementDueDate}
                  onChange={(e) => setNewRequirementDueDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apply to Sections:
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedSections.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSections([]);
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">All Sections</span>
                    </label>
                    {getTeamSections().map((section) => (
                      <label key={section} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(section)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSections([
                                ...selectedSections,
                                section,
                              ]);
                            } else {
                              setSelectedSections(
                                selectedSections.filter((s) => s !== section)
                              );
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">Section {section}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed File Formats:
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[
                      ".pdf",
                      ".doc",
                      ".docx",
                      ".ppt",
                      ".pptx",
                      ".jpg",
                      ".jpeg",
                      ".png",
                      ".txt",
                      ".zip",
                    ].map((format) => (
                      <label key={format} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedFormats.includes(format)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFormats([...selectedFormats, format]);
                            } else {
                              setSelectedFormats(
                                selectedFormats.filter((f) => f !== format)
                              );
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{format}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  onClick={addUploadRequirement}
                  disabled={isLoading("addUploadRequirement")}
                  className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    isLoading("addUploadRequirement")
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isLoading("addUploadRequirement") ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <FaPlus /> Add Requirement
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* <div className="bg-red-50 p-6 rounded-lg mb-6 border-l-4 border-red-500">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Fix File Access Issues
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                If students are unable to download files due to "Blocked for
                delivery" errors, click below to fix access permissions for all
                existing files.
              </p>
              <button
                onClick={async () => {
                  if (
                    window.confirm(
                      "Fix access permissions for all existing files? This may take a few minutes."
                    )
                  ) {
                    setLoading("fixAccess", true);
                    try {
                      const response = await fetch(
                        "/api/fix-cloudinary-access",
                        {
                          method: "POST",
                        }
                      );
                      if (response.ok) {
                        const result = await response.json();
                        showToast(
                          `Fixed access for ${result.totalFixed} files successfully!`
                        );
                      } else {
                        showToast("Error fixing file access", "error");
                      }
                    } catch (error) {
                      showToast("Error fixing file access", "error");
                    } finally {
                      setLoading("fixAccess", false);
                    }
                  }
                }}
                disabled={isLoading("fixAccess")}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isLoading("fixAccess")
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {isLoading("fixAccess") ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Fixing Access...
                  </>
                ) : (
                  <>🔧 Fix File Access Permissions</>
                )}
              </button>
            </div> */}

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Current Requirements & Submissions
              </h4>
              <div className="space-y-4">
                {uploadRequirements.map((req) => {
                  const reqSubmissions = submissions.filter(
                    (sub) => sub.requirementId?._id === req._id
                  );
                  const totalBatches = teams.length;
                  const submittedBatches = new Set(
                    reqSubmissions.map((sub) => sub.batchName)
                  ).size;

                  return (
                    <div
                      key={req._id}
                      className="bg-white p-4 rounded-lg border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-semibold text-gray-800">
                            {req.title}
                          </h5>
                          <p className="text-gray-600 text-sm">
                            {req.description}
                          </p>
                          <p className="text-blue-600 text-sm mt-1">
                            Sections:{" "}
                            {req.sections && req.sections.length > 0
                              ? req.sections.join(", ")
                              : "All"}
                          </p>
                          {req.allowedFormats &&
                            req.allowedFormats.length > 0 && (
                              <p className="text-green-600 text-sm mt-1">
                                Allowed formats: {req.allowedFormats.join(", ")}
                              </p>
                            )}
                          {req.dueDate && (
                            <p className="text-gray-500 text-xs mt-1">
                              Due: {new Date(req.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Progress: {submittedBatches}/{totalBatches}
                          </div>
                          <div className="w-32 bg-gray-200 rounded-full h-2 mb-3">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${
                                  (submittedBatches / totalBatches) * 100
                                }%`,
                              }}
                            ></div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingRequirement(req._id);
                                setEditDeadline(
                                  req.dueDate
                                    ? new Date(req.dueDate)
                                        .toISOString()
                                        .split("T")[0]
                                    : ""
                                );
                              }}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteUploadRequirement(req._id)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                      {editingRequirement === req._id && (
                        <div className="mt-3 p-3 bg-gray-50 rounded border-t">
                          <h6 className="text-sm font-medium text-gray-700 mb-2">
                            Edit Deadline:
                          </h6>
                          <div className="flex gap-2 items-center">
                            <input
                              type="date"
                              value={editDeadline}
                              onChange={(e) => setEditDeadline(e.target.value)}
                              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              onClick={() => updateRequirementDeadline(req._id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingRequirement(null);
                                setEditDeadline("");
                              }}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="mt-3">
                        <h6 className="text-sm font-medium text-gray-700 mb-2">
                          Submissions:
                        </h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {reqSubmissions.map((sub) => (
                            <div
                              key={sub._id}
                              className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center justify-between"
                            >
                              <span>
                                {sub.batchName} - {sub.originalName}
                              </span>
                              {sub.isLocked && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(
                                        `/api/submissions/${sub._id}/unlock`,
                                        {
                                          method: "PUT",
                                        }
                                      );
                                      if (response.ok) {
                                        await loadSubmissions();
                                        showToast(
                                          "File upload unlocked successfully!"
                                        );
                                      }
                                    } catch (error) {
                                      showToast(
                                        "Error unlocking file upload",
                                        "error"
                                      );
                                    }
                                  }}
                                  className="ml-2 px-1 py-0.5 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition-colors flex items-center gap-1"
                                  title="Unlock file upload"
                                >
                                  <FaUnlock />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "reviews":
        return (
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Review Management
            </h3>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <div className="flex items-center">
                <span className="text-blue-600 text-xl mr-3">ℹ️</span>
                <div>
                  <h4 className="text-lg font-semibold text-blue-800">
                    Active Review: {activeReview ? activeReview.name : "None"}
                  </h4>
                  <p className="text-blue-700 mt-1">
                    {activeReview
                      ? activeReview.description
                      : "No active review. Create one to start scoring."}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Create New Review
              </h4>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newReviewName}
                  onChange={(e) => setNewReviewName(e.target.value)}
                  placeholder="Review Name (e.g., Mid Review, Final Review)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <textarea
                  value={newReviewDescription}
                  onChange={(e) => setNewReviewDescription(e.target.value)}
                  placeholder="Review Description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                />
                <input
                  type="date"
                  value={newReviewDate}
                  onChange={(e) => setNewReviewDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={createReview}
                  disabled={isLoading("createReview")}
                  className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    isLoading("createReview")
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isLoading("createReview") ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FaPlus /> Create Review
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                All Reviews
              </h4>
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review._id}
                    className={`p-4 rounded-lg border ${
                      review.isActive
                        ? "bg-green-50 border-green-500"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-semibold text-gray-800">
                          {review.name}
                          {review.isActive && (
                            <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                              Active
                            </span>
                          )}
                        </h5>
                        <p className="text-gray-600 text-sm mt-1">
                          {review.description}
                        </p>
                        {review.reviewDate && (
                          <p className="text-blue-600 text-sm mt-1">
                            Review Date:{" "}
                            {new Date(review.reviewDate).toLocaleDateString()}
                          </p>
                        )}
                        <p className="text-gray-500 text-xs mt-1">
                          Created:{" "}
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!review.isActive && (
                          <button
                            onClick={() => activateReview(review._id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() =>
                            resetReviewData(review._id, review.name)
                          }
                          className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm"
                        >
                          Reset Data
                        </button>
                        <button
                          onClick={() => deleteReview(review._id, review.name)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "templates":
        return (
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Document Templates
            </h3>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Upload New Template
              </h4>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  placeholder="Template Title (e.g., Report Format, PPT Template)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <textarea
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20"
                />
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    onChange={handleTemplateFileSelect}
                    className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <button
                    onClick={uploadTemplate}
                    disabled={
                      !selectedTemplateFile || !newTemplateTitle || isUploading
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      selectedTemplateFile && newTemplateTitle && !isUploading
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FaUpload /> Upload Template
                      </>
                    )}
                  </button>
                </div>
                {selectedTemplateFile && (
                  <p className="text-sm text-green-600 mt-2">
                    Selected: {selectedTemplateFile.name}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Available Templates
              </h4>
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template._id}
                    className="bg-white p-4 rounded-lg border border-gray-200"
                  >
                    {editingTemplate === template._id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editTemplateData.title}
                          onChange={(e) =>
                            setEditTemplateData({
                              ...editTemplateData,
                              title: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Template Title"
                        />
                        <textarea
                          value={editTemplateData.description}
                          onChange={(e) =>
                            setEditTemplateData({
                              ...editTemplateData,
                              description: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20"
                          placeholder="Description (optional)"
                        />
                        <div className="flex gap-2 items-center">
                          <input
                            type="file"
                            onChange={(e) => {
                              setEditTemplateData({
                                ...editTemplateData,
                                selectedFile: e.target.files[0],
                              });
                            }}
                            className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          {editTemplateData.selectedFile && (
                            <button
                              onClick={() =>
                                updateTemplate(
                                  template._id,
                                  editTemplateData.selectedFile
                                )
                              }
                              disabled={isEditUploading}
                              className={`px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors ${
                                isEditUploading
                                  ? "bg-gray-400 text-white cursor-not-allowed"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}
                            >
                              {isEditUploading ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <FaUpload /> Upload File
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        {editTemplateData.selectedFile && (
                          <p className="text-xs text-green-600">
                            Selected: {editTemplateData.selectedFile.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-600">
                          Leave file empty to keep current file
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTemplate(template._id)}
                            disabled={isEditUploading}
                            className={`px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors ${
                              isEditUploading
                                ? "bg-gray-400 text-white cursor-not-allowed"
                                : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                          >
                            {isEditUploading ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                Saving...
                              </>
                            ) : (
                              <>
                                <FaCheck /> Save Changes
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingTemplate(null);
                              setEditTemplateData({});
                            }}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <FaTimes /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-semibold text-gray-800">
                            {template.title}
                          </h5>
                          {template.description && (
                            <p className="text-gray-600 text-sm mt-1">
                              {template.description}
                            </p>
                          )}
                          <p className="text-gray-500 text-xs mt-1">
                            File: {template.originalName} | Uploaded:{" "}
                            {new Date(template.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`/api/templates/${template._id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <FaDownload /> Download
                          </a>
                          <button
                            onClick={() => startEditTemplate(template)}
                            className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            onClick={() => deleteTemplate(template._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {templates.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No templates uploaded yet. Upload templates to help students
                    with document preparation.
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case "reports":
        return (
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Reports & Downloads
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-700 mb-4">
                  Main Reports
                </h4>
                <div className="space-y-3">
                  <button
                    onClick={() => previewReport("complete")}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
                  >
                    📊 Complete Score Report
                    <p className="text-sm text-blue-100 mt-1">
                      All teams with scores
                    </p>
                  </button>
                  <button
                    onClick={() => previewReport("review")}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-left"
                  >
                    📝 Review Report
                    <p className="text-sm text-purple-100 mt-1">
                      Current active review data
                    </p>
                  </button>
                  <button
                    onClick={() => setShowSectionDialog(true)}
                    className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-left"
                  >
                    📁 Section-wise Report
                    <p className="text-sm text-orange-100 mt-1">
                      Select specific section
                    </p>
                  </button>
                  <button
                    onClick={() => previewReport("attendance")}
                    className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-left"
                  >
                    👥 Attendance Report
                    <p className="text-sm text-red-100 mt-1">
                      Present/Absent status
                    </p>
                  </button>
                  <button
                    onClick={() => previewReport("submissions")}
                    className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-left"
                  >
                    📎 Submissions Report
                    <p className="text-sm text-yellow-100 mt-1">
                      File upload status
                    </p>
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-700 mb-4">
                  Batch-wise Reports
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {teams.map((team) => (
                    <button
                      key={team._id}
                      onClick={() => previewReport("batch", team.name)}
                      className="w-full px-3 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors text-left text-sm"
                    >
                      📄 {team.name}
                      <p className="text-xs text-teal-100 mt-1">
                        {team.members.split(",").length} members
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "file-manager":
        return (
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              File Manager
            </h3>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Group submissions by team */}
                {teams
                  .sort((a, b) => {
                    const aName = a.name.replace(/Batch\s+/i, "");
                    const bName = b.name.replace(/Batch\s+/i, "");
                    return aName.localeCompare(bName, undefined, {
                      numeric: true,
                      sensitivity: "base",
                    });
                  })
                  .map((team) => {
                    const teamSubmissions = submissions.filter(
                      (sub) => sub.batchName === team.name
                    );

                    return (
                      <div
                        key={team._id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-bold text-sm">
                              📁
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800 text-sm">
                              {team.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {teamSubmissions.length} files
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {teamSubmissions.length > 0 ? (
                            teamSubmissions.map((submission) => {
                              const fileExt = submission.originalName
                                ?.split(".")
                                .pop()
                                ?.toLowerCase();
                              const fileIcon =
                                fileExt === "pdf"
                                  ? "📄"
                                  : ["jpg", "jpeg", "png", "gif"].includes(
                                      fileExt
                                    )
                                  ? "🖼️"
                                  : ["ppt", "pptx"].includes(fileExt)
                                  ? "📊"
                                  : ["doc", "docx"].includes(fileExt)
                                  ? "📝"
                                  : "📎";

                              return (
                                <div
                                  key={submission._id}
                                  className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center flex-1 min-w-0">
                                    <span className="mr-2 text-sm">
                                      {fileIcon}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-gray-700 truncate">
                                        {submission.requirementId?.title ||
                                          "Unknown"}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">
                                        {submission.originalName}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 ml-2">
                                    <a
                                      href={submission.filePath}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                      title="Download"
                                    >
                                      <FaDownload className="w-3 h-3" />
                                    </a>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(
                                          submission.filePath
                                        );
                                        showToast("Link copied to clipboard!");
                                      }}
                                      className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                      title="Copy Link"
                                    >
                                      📋
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-gray-400 text-center py-4">
                              No files uploaded
                            </p>
                          )}
                        </div>

                        {teamSubmissions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              Last upload:{" "}
                              {new Date(
                                Math.max(
                                  ...teamSubmissions.map(
                                    (s) => new Date(s.uploadedAt)
                                  )
                                )
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {teams.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📁</div>
                  <h4 className="text-lg font-semibold text-gray-600 mb-2">
                    No Teams Found
                  </h4>
                  <p className="text-gray-500">
                    Create teams first to see their file uploads here.
                  </p>
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
    <div className="flex min-h-screen bg-gray-100">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 text-white flex flex-col fixed h-screen">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center mb-2">
            <img src="/au_logo.svg" alt="AU Logo" className="h-20 w-20 mr-3" />
            <h2 className="text-xl font-bold text-white">Head Dashboard</h2>
          </div>
          <p className="text-gray-300 text-sm">{currentUser.username}</p>
        </div>

        <nav className="flex-1 py-6">
          <button
            className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors ${
              activeTab === "dashboard"
                ? "bg-gray-700 text-white border-r-3 border-blue-500"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onClick={() => setActiveTab("dashboard")}
          >
            <FaTachometerAlt /> Dashboard
          </button>
          <button
            className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors ${
              activeTab === "teams-overview"
                ? "bg-gray-700 text-white border-r-3 border-blue-500"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onClick={() => setActiveTab("teams-overview")}
          >
            <FaClipboardList /> Teams Overview
          </button>
          <button
            className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors ${
              activeTab === "team-management"
                ? "bg-gray-700 text-white border-r-3 border-blue-500"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onClick={() => setActiveTab("team-management")}
          >
            <FaUsers /> Team Management
          </button>

          <button
            className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors ${
              activeTab === "columns"
                ? "bg-gray-700 text-white border-r-3 border-blue-500"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onClick={() => setActiveTab("columns")}
          >
            <FaColumns /> Columns
          </button>
          <button
            className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors ${
              activeTab === "users"
                ? "bg-gray-700 text-white border-r-3 border-blue-500"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onClick={() => setActiveTab("users")}
          >
            <FaUserFriends /> Users
          </button>
          <button
            className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors ${
              activeTab === "uploads"
                ? "bg-gray-700 text-white border-r-3 border-blue-500"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onClick={() => setActiveTab("uploads")}
          >
            <FaUpload /> Uploads
          </button>
          <button
            className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors ${
              activeTab === "templates"
                ? "bg-gray-700 text-white border-r-3 border-blue-500"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onClick={() => setActiveTab("templates")}
          >
            <FaFileAlt /> Templates
          </button>
          <button
            className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors ${
              activeTab === "reviews"
                ? "bg-gray-700 text-white border-r-3 border-blue-500"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onClick={() => setActiveTab("reviews")}
          >
            <FaClipboardList /> Reviews
          </button>
          <button
            className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors ${
              activeTab === "reports"
                ? "bg-gray-700 text-white border-r-3 border-blue-500"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onClick={() => setActiveTab("reports")}
          >
            <FaChartBar /> Reports
          </button>
          <button
            className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors ${
              activeTab === "file-manager"
                ? "bg-gray-700 text-white border-r-3 border-blue-500"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onClick={() => setActiveTab("file-manager")}
          >
            <FaFileAlt /> File Manager
          </button>
        </nav>

        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onLogout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
          <p className="text-center text-gray-200 font-medium text-sm mt-4">
            Developed by <b className="text-white">Team Ofzen</b>
          </p>
        </div>
      </div>

      <div className="flex-1 ml-64 overflow-y-auto">{renderContent()}</div>

      {/* Section Selection Dialog */}
      {showSectionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Select Section
            </h3>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
            >
              <option value="">Choose a section</option>
              {getTeamSections().map((section) => (
                <option key={section} value={section}>
                  Section {section}
                </option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSectionDialog(false);
                  setSelectedSection("");
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedSection) {
                    previewReport("section", selectedSection);
                    setSelectedSection("");
                    setShowSectionDialog(false);
                  }
                }}
                disabled={!selectedSection}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Edit Team Details
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                value={editTeamData.name}
                onChange={(e) =>
                  setEditTeamData({ ...editTeamData, name: e.target.value })
                }
                placeholder="Team Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Members:
                </label>
                {editTeamData.members?.map((member, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={member}
                      onChange={(e) => updateMember(index, e.target.value)}
                      placeholder={`Member ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMember}
                  className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <FaPlus /> Add Member
                </button>
              </div>
              <input
                type="text"
                value={editTeamData.projectTitle}
                onChange={(e) =>
                  setEditTeamData({
                    ...editTeamData,
                    projectTitle: e.target.value,
                  })
                }
                placeholder="Project Title (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={editTeamData.guide}
                onChange={(e) =>
                  setEditTeamData({ ...editTeamData, guide: e.target.value })
                }
                placeholder="Guide (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setEditingTeam(null);
                  setEditTeamData({});
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateTeam}
                disabled={isLoading("updateTeam")}
                className={`px-4 py-2 rounded transition-colors flex items-center gap-2 ${
                  isLoading("updateTeam")
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isLoading("updateTeam") ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  "Update Team"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {showPreview && reportPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-5/6 h-5/6 mx-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {reportPreview.type.charAt(0).toUpperCase() +
                  reportPreview.type.slice(1)}{" "}
                Report Preview
                {reportPreview.section && ` - ${reportPreview.section}`}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    downloadReport(reportPreview.type, reportPreview.section);
                    setShowPreview(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <FaDownload /> Download Excel
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  <FaTimes /> Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto border border-gray-200 rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {reportPreview.data.headers?.map((header, index) => (
                      <th
                        key={index}
                        className="px-3 py-2 text-left font-medium text-gray-700 border-b"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportPreview.data.rows?.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-3 py-2 border-b text-gray-600"
                        >
                          {cell || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!reportPreview.data.rows ||
                reportPreview.data.rows.length === 0) && (
                <div className="p-8 text-center text-gray-500">
                  No data available for this report
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeadDashboard;
