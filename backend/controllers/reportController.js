const Team = require("../models/Team");
const Review = require("../models/Review");
const Column = require("../models/Column");
const User = require("../models/User");
const Submission = require("../models/Submission");
const xlsx = require("xlsx");

const generateReport = async (req, res) => {
  try {
    const { type, section } = req.query;
    const teams = await Team.find();
    const activeReview = await Review.findOne({ isActive: true });
    const columns = activeReview
      ? await Column.find({ reviewId: activeReview._id }).sort({ order: 1 })
      : [];
    const users = await User.find({ role: "reviewer" });

    let filteredTeams = teams;
    let filename = type;

    if (type === "section" && section) {
      filteredTeams = teams.filter(
        (team) =>
          team.name.replace("Batch ", "").charAt(0).toUpperCase() === section
      );
      filename = `section_${section}`;
    } else if (type === "batch" && section) {
      filteredTeams = teams.filter((team) => team.name === section);
      filename = `batch_${section.replace(/\s+/g, "_")}`;
    }

    // Add review name to filename if available
    if (activeReview) {
      filename = `${activeReview.name.replace(/\s+/g, "_")}_${filename}`;
    }

    const workbook = xlsx.utils.book_new();
    const worksheetData = [];

    if (type === "attendance") {
      worksheetData.push(["Team", "Roll No", "Member Name", "Status"]);
      filteredTeams.forEach((team) => {
        worksheetData.push([team.name, "", "", ""]);
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

          worksheetData.push(["", rollNo, memberName, status]);
        });
      });
    } else if (type === "submissions") {
      const submissions = await Submission.find().populate("requirementId");
      worksheetData.push(["Team", "Requirement", "File", "Upload Date"]);
      submissions.forEach((sub) => {
        worksheetData.push([
          sub.batchName,
          sub.requirementId?.title || "N/A",
          sub.originalName,
          new Date(sub.uploadedAt).toLocaleDateString(),
        ]);
      });
    } else if (type === "review" && activeReview) {
      // Analytics for review report
      worksheetData.push(["Review Analytics Summary"]);
      worksheetData.push(["Review Name:", activeReview.name]);
      worksheetData.push(["Description:", activeReview.description || "N/A"]);
      worksheetData.push(["Total Teams:", filteredTeams.length]);

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

      worksheetData.push(["Teams with Scoring Submitted:", submittedCount]);
      worksheetData.push([
        "Teams with Scoring Pending:",
        filteredTeams.length - submittedCount,
      ]);
      worksheetData.push(["Total Students:", totalStudents]);
      worksheetData.push(["Students Absent:", absentCount]);
      worksheetData.push([""]);
    } else {
      const headers = [
        "Batch Name",
        "Roll No",
        "Member Name",
        "Project Title",
        "Guide",
      ];
      columns.forEach((col) => {
        headers.push(col.name);
      });
      headers.push("Total", "Reviewers");
      worksheetData.push(headers);

      filteredTeams.forEach((team) => {
        const members = team.members.split(",").map((m) => m.trim());

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
        columns.forEach((col) => {
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
            teamRow.push(value);
          } else {
            teamRow.push("");
          }
        });
        teamRow.push("", submittedBy);
        worksheetData.push(teamRow);

        members.forEach((member) => {
          const rollMatch = member.match(/\(([^)]+)\)$/);
          const rollNo = rollMatch ? rollMatch[1] : "";
          const memberName = rollMatch
            ? member.replace(/\s*\([^)]+\)$/, "").trim()
            : member;

          const memberRow = [team.name, rollNo, memberName, "", ""];
          const isAbsent =
            activeReview &&
            team.reviewData?.[activeReview._id]?._absentMembers?.[member];
          let total = 0;

          columns.forEach((col) => {
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
                if (
                  col.inputType === "number" &&
                  value &&
                  !isNaN(parseFloat(value))
                ) {
                  total += parseFloat(value);
                }
                memberRow.push(value);
              }
            } else {
              memberRow.push("");
            }
          });

          memberRow.push(isAbsent ? "Absent" : total, "");
          worksheetData.push(memberRow);
        });

        worksheetData.push([
          "",
          "",
          "",
          "",
          ...Array(columns.length + 2).fill(""),
        ]);
      });
    }

    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    const sheetName =
      type === "review" && activeReview ? activeReview.name : "Report";
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}_report.xlsx"`
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { generateReport };
