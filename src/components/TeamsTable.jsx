import { useState, useEffect } from "react";

function TeamsTable({
  teams,
  customColumns,
  isHead,
  onDataChange,
  currentUser,
}) {
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({});
  const [submittingTeam, setSubmittingTeam] = useState(null);
  const [activeReview, setActiveReview] = useState(null);
  const [absentMembers, setAbsentMembers] = useState({});

  useEffect(() => {
    fetchActiveReview();
  }, []);

  useEffect(() => {
    // Initialize absent members from saved data
    if (activeReview && teams.length > 0) {
      const savedAbsent = {};
      teams.forEach(team => {
        const absentData = team.reviewData?.[activeReview._id]?._absentMembers;
        if (absentData) {
          savedAbsent[team._id] = absentData;
        }
      });
      setAbsentMembers(savedAbsent);
    }
  }, [activeReview, teams]);

  const fetchActiveReview = async () => {
    try {
      const response = await fetch("/api/reviews/active");
      if (response.ok) {
        const review = await response.json();
        setActiveReview(review);
      }
    } catch (error) {
      console.error("Error fetching active review:", error);
    }
  };

  const toggleTeam = (teamId) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  const getDisplayValue = (team, column, member = null) => {
    if (!activeReview) return "";

    if (!isHead) {
      // Check pending changes first, then review data
      const teamChanges = pendingChanges[team._id] || {};
      const pendingValue = member
        ? teamChanges[column.name]?.[member]
        : teamChanges[column.name];
      if (pendingValue !== undefined) {
        return pendingValue;
      }

      const reviewData = team.reviewData?.[activeReview._id] || {};
      if (member) {
        return reviewData[column.name]?.[member] || "";
      }
      return reviewData[column.name] || "";
    } else {
      // Head sees the same data as reviewers
      const reviewData = team.reviewData?.[activeReview._id] || {};
      if (member) {
        // Check if member is marked as absent
        const savedAbsent = reviewData._absentMembers?.[member];
        if (savedAbsent) return 'Absent';
        return reviewData[column.name]?.[member] || "";
      }
      return reviewData[column.name] || "";
    }
  };

  const isAbsentFromSavedData = (teamId, member) => {
    if (!activeReview) return false;
    const team = teams.find(t => t._id === teamId);
    return team?.reviewData?.[activeReview._id]?._absentMembers?.[member] || false;
  };

  const deleteTeam = async (teamId) => {
    if (confirm("Are you sure you want to delete this team?")) {
      try {
        const response = await fetch(`/api/teams/${teamId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await onDataChange();
        }
      } catch (error) {
        alert("Error deleting team");
      }
    }
  };

  const updateTeamStatus = async (teamId, field, status) => {
    if (isHead) {
      const updateData = { [field]: status };
      try {
        const response = await fetch(`/api/teams/${teamId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });
        if (response.ok) {
          await onDataChange();
        }
      } catch (error) {
        alert("Error updating team");
      }
    } else {
      // Store in pending changes for reviewers
      setPendingChanges((prev) => ({
        ...prev,
        [teamId]: {
          ...prev[teamId],
          [field]: status,
        },
      }));
    }
  };

  const updateMemberScore = async (teamId, field, member, score) => {
    if (isHead) {
      const team = teams.find((t) => t._id === teamId);
      const updateData = {
        [field]: {
          ...team[field],
          [member]: score,
        },
      };
      try {
        const response = await fetch(`/api/teams/${teamId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });
        if (response.ok) {
          await onDataChange();
        }
      } catch (error) {
        alert("Error updating member score");
      }
    } else {
      // Store in pending changes for reviewers
      setPendingChanges((prev) => {
        const currentTeamChanges = prev[teamId] || {};
        const currentFieldData = currentTeamChanges[field] || {};
        return {
          ...prev,
          [teamId]: {
            ...currentTeamChanges,
            [field]: {
              ...currentFieldData,
              [member]: score,
            },
          },
        };
      });
    }
  };

  const validateTeamData = (teamId) => {
    const team = teams.find((t) => t._id === teamId);
    const members = team.members.split(",").map((m) => m.trim());
    const changes = pendingChanges[teamId] || {};
    const teamAbsent = absentMembers[teamId] || {};

    // Check team-level columns
    for (const col of customColumns) {
      if (col.type === "team") {
        const value = changes[col.name] || getDisplayValue(team, col);
        if (!value && col.inputType !== "options") {
          return `Please fill ${col.name} for team`;
        }
      }
    }

    // Check individual columns for non-absent members
    for (const member of members) {
      if (teamAbsent[member]) continue; // Skip absent members

      for (const col of customColumns) {
        if (col.type === "individual") {
          const value =
            changes[col.name]?.[member] || getDisplayValue(team, col, member);
          if (!value && col.inputType !== "options") {
            return `Please fill ${col.name} for ${member} or mark as absent`;
          }

          // Validate max marks
          if (col.maxMarks && value && !isNaN(value)) {
            if (parseFloat(value) > col.maxMarks) {
              return `${col.name} for ${member} cannot exceed ${col.maxMarks} marks`;
            }
          }
        }
      }
    }

    return null;
  };

  const toggleAbsent = (teamId, member) => {
    const currentSavedStatus = isAbsentFromSavedData(teamId, member);
    const currentPendingStatus = absentMembers[teamId]?.[member];
    
    // If saved as absent, toggling should mark as present (false)
    // If not saved as absent, toggle the pending status
    const newStatus = currentSavedStatus ? false : !currentPendingStatus;
    
    setAbsentMembers((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [member]: newStatus,
      },
    }));
  };

  const submitChanges = async (teamId) => {
    const validationError = validateTeamData(teamId);
    if (validationError) {
      alert(validationError);
      return;
    }

    const changes = pendingChanges[teamId] || {};
    const teamAbsent = absentMembers[teamId] || {};
    
    // Always include absent members data, even if empty
    const submissionData = { ...changes, _absentMembers: teamAbsent };

    setSubmittingTeam(teamId);
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId: currentUser?.username, ...submissionData }),
      });

      if (response.ok) {
        setPendingChanges((prev) => {
          const updated = { ...prev };
          delete updated[teamId];
          return updated;
        });
        setAbsentMembers((prev) => {
          const updated = { ...prev };
          delete updated[teamId];
          return updated;
        });
        await onDataChange();
      }
    } catch (error) {
      alert("Error submitting changes");
    } finally {
      setSubmittingTeam(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="px-4 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <h3 className="text-xl font-bold text-white">
          {isHead ? "Teams Overview" : "Teams for Review"}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team & Members
              </th>
              {customColumns.map((col) => (
                <th
                  key={col.name}
                  className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.name}
                  {col.maxMarks && (
                    <span className="text-xs text-gray-500 mt-1">
                      {`(${col.maxMarks})`}
                    </span>
                  )}
                </th>
              ))}
              <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teams.map((team) => {
              const members = team.members.split(",").map((m) => m.trim());
              const rows = [];

              // Team Row
              rows.push(
                <tr
                  key={team._id}
                  className="bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors border-l-4 border-blue-500"
                  onClick={() => toggleTeam(team._id)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-blue-600 mr-2">
                        {expandedTeam === team._id ? "▼" : "▶"}
                      </span>
                      <span className="text-lg font-semibold text-blue-800">
                        {team.name}
                      </span>
                    </div>
                  </td>
                  {customColumns.map((col) => (
                    <td key={col.name} className="px-4 py-4 whitespace-nowrap">
                      {col.type === "team" ? (
                        isHead ? (
                          <span className="text-gray-700">
                            {getDisplayValue(team, col) || "-"}
                          </span>
                        ) : col.inputType === "options" ? (
                          <select
                            value={
                              getDisplayValue(team, col) ||
                              (col.options && col.options[0]) ||
                              ""
                            }
                            onChange={(e) =>
                              updateTeamStatus(
                                team._id,
                                col.name,
                                e.target.value
                              )
                            }
                            className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {col.options &&
                              col.options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                          </select>
                        ) : col.inputType === "textarea" ? (
                          <textarea
                            value={getDisplayValue(team, col) || ""}
                            onChange={(e) =>
                              updateTeamStatus(
                                team._id,
                                col.name,
                                e.target.value
                              )
                            }
                            className="w-48 h-16 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                            placeholder="Enter remarks..."
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : col.inputType === "number" ? (
                          <div className="flex flex-col">
                            <input
                              type="number"
                              value={getDisplayValue(team, col) || ""}
                              onChange={(e) =>
                                updateTeamStatus(
                                  team._id,
                                  col.name,
                                  e.target.value
                                )
                              }
                              className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={
                                col.maxMarks ? ` ${col.maxMarks}` : ""
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                            {col.maxMarks && (
                              <span className="text-xs text-gray-500 mt-1">
                                /{col.maxMarks}
                              </span>
                            )}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={getDisplayValue(team, col) || ""}
                            onChange={(e) =>
                              updateTeamStatus(
                                team._id,
                                col.name,
                                e.target.value
                              )
                            }
                            className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                  {isHead ? (
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTeam(team._id);
                        }}
                        className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  ) : (
                    <td className="px-4 py-4 whitespace-nowrap">
                      {(pendingChanges[team._id] || absentMembers[team._id]) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            submitChanges(team._id);
                          }}
                          disabled={submittingTeam === team._id}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                        >
                          {submittingTeam === team._id ? "Saving..." : "Submit"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );

              // Member Rows (only show if expanded)
              if (expandedTeam === team._id) {
                members.forEach((member) => {
                  rows.push(
                    <tr
                      key={`${team._id}-${member}`}
                      className="bg-gray-50 border-l-4 border-gray-300"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center pl-8">
                          <span className="text-gray-600 mr-2">👤</span>
                          <span
                            className={`text-gray-700 ${
                              absentMembers[team._id]?.[member] || isAbsentFromSavedData(team._id, member)
                                ? "line-through opacity-50"
                                : ""
                            }`}
                            title={member}
                          >
                            {member.match(/\(([^)]+)\)/)
                              ? member.match(/\(([^)]+)\)/)[1]
                              : member}
                          </span>
                          {!isHead && (
                            <label className="ml-3 flex items-center text-xs">
                              <input
                                type="checkbox"
                                checked={
                                  absentMembers[team._id]?.[member] || isAbsentFromSavedData(team._id, member) || false
                                }
                                onChange={() => toggleAbsent(team._id, member)}
                                className="mr-1"
                              />
                              Absent
                            </label>
                          )}
                        </div>
                      </td>
                      {customColumns.map((col) => (
                        <td
                          key={col.name}
                          className="px-4 py-3 whitespace-nowrap"
                        >
                          {col.type === "individual" ? (
                            isHead ? (
                              <span className="text-gray-700">
                                {absentMembers[team._id]?.[member] || isAbsentFromSavedData(team._id, member)
                                  ? "Absent"
                                  : getDisplayValue(team, col, member) || "-"}
                              </span>
                            ) : absentMembers[team._id]?.[member] || isAbsentFromSavedData(team._id, member) ? (
                              <span className="text-gray-500 italic">
                                Absent
                              </span>
                            ) : col.inputType === "options" ? (
                              <select
                                value={
                                  getDisplayValue(team, col, member) ||
                                  (col.options && col.options[0]) ||
                                  ""
                                }
                                onChange={(e) =>
                                  updateMemberScore(
                                    team._id,
                                    col.name,
                                    member,
                                    e.target.value
                                  )
                                }
                                className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                {col.options &&
                                  col.options.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                              </select>
                            ) : col.inputType === "textarea" ? (
                              <textarea
                                value={getDisplayValue(team, col, member) || ""}
                                onChange={(e) =>
                                  updateMemberScore(
                                    team._id,
                                    col.name,
                                    member,
                                    e.target.value
                                  )
                                }
                                className="w-44 h-12 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                                placeholder="Enter remarks..."
                              />
                            ) : col.inputType === "number" ? (
                              <div className="flex flex-col">
                                <input
                                  type="number"
                                  value={
                                    getDisplayValue(team, col, member) || ""
                                  }
                                  onChange={(e) =>
                                    updateMemberScore(
                                      team._id,
                                      col.name,
                                      member,
                                      e.target.value
                                    )
                                  }
                                  className="w-20 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder={
                                    col.maxMarks ? `${col.maxMarks}` : ""
                                  }
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <input
                                  type="text"
                                  value={
                                    getDisplayValue(team, col, member) || ""
                                  }
                                  onChange={(e) =>
                                    updateMemberScore(
                                      team._id,
                                      col.name,
                                      member,
                                      e.target.value
                                    )
                                  }
                                  className="w-20 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder={
                                    col.maxMarks ? `${col.maxMarks}` : ""
                                  }
                                />
                                {col.maxMarks && (
                                  <span className="text-xs text-gray-500 mt-1">
                                    /{col.maxMarks}
                                  </span>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      ))}
                      {isHead ? (
                        <td className="px-4 py-3"></td>
                      ) : (
                        <td className="px-4 py-3"></td>
                      )}
                    </tr>
                  );
                });
              }

              return rows;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TeamsTable;
