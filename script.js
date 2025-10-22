// Global variables
let teams = [];
let currentRole = null;
let customColumns = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

// Login functionality
function loginAs(role) {
    currentRole = role;
    document.getElementById('loginSection').classList.add('hidden');
    
    if (role === 'head') {
        document.getElementById('headDashboard').classList.remove('hidden');
        renderTeamsTable();
    } else {
        document.getElementById('reviewerDashboard').classList.remove('hidden');
        renderReviewerView();
    }
}

function logout() {
    currentRole = null;
    document.getElementById('headDashboard').classList.add('hidden');
    document.getElementById('reviewerDashboard').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
}

// Team management
async function addColumn() {
    const columnName = document.getElementById('columnName').value.trim();
    const columnType = document.getElementById('columnType').value;
    
    if (!columnName) {
        alert('Please enter a column name');
        return;
    }
    
    if (customColumns.find(col => col.name === columnName)) {
        alert('Column already exists');
        return;
    }
    
    try {
        const response = await fetch('/api/columns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: columnName, type: columnType })
        });
        
        if (response.ok) {
            await loadData();
            document.getElementById('columnName').value = '';
        }
    } catch (error) {
        alert('Error adding column');
    }
}

async function addTeam() {
    const teamName = document.getElementById('teamName').value.trim();
    const teamMembers = document.getElementById('teamMembers').value.trim();
    
    if (!teamName || !teamMembers) {
        alert('Please fill in both team name and members');
        return;
    }
    
    const newTeam = {
        name: teamName,
        members: teamMembers,
        abstractCopy: 'Pending',
        reportCopy: 'Pending',
        presentation: 'Pending'
    };
    
    // Add custom columns to new team
    customColumns.forEach(col => {
        if (col.type === 'individual') {
            const members = teamMembers.split(',').map(m => m.trim());
            newTeam[col.name] = {};
            members.forEach(member => {
                newTeam[col.name][member] = '';
            });
        } else {
            newTeam[col.name] = '';
        }
    });
    
    try {
        const response = await fetch('/api/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTeam)
        });
        
        if (response.ok) {
            await loadData();
            document.getElementById('teamName').value = '';
            document.getElementById('teamMembers').value = '';
        }
    } catch (error) {
        alert('Error adding team');
    }
}

async function deleteTeam(teamId) {
    if (confirm('Are you sure you want to delete this team?')) {
        try {
            const response = await fetch(`/api/teams/${teamId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await loadData();
            }
        } catch (error) {
            alert('Error deleting team');
        }
    }
}

async function updateTeamStatus(teamId, field, status) {
    const team = teams.find(t => t._id === teamId);
    if (team) {
        team[field] = status;
        
        try {
            const response = await fetch(`/api/teams/${teamId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(team)
            });
            
            if (response.ok) {
                renderTeamsTable();
                if (currentRole === 'reviewer') {
                    renderReviewerView();
                }
            }
        } catch (error) {
            alert('Error updating team');
        }
    }
}

async function updateMemberScore(teamId, field, member, score) {
    const team = teams.find(t => t._id === teamId);
    if (team) {
        if (!team[field]) team[field] = {};
        team[field][member] = score;
        
        try {
            const response = await fetch(`/api/teams/${teamId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(team)
            });
            
            if (response.ok) {
                renderTeamsTable();
            }
        } catch (error) {
            alert('Error updating member score');
        }
    }
}

async function removeColumn() {
    const columnName = document.getElementById('removeColumnSelect').value;
    
    if (!columnName) {
        alert('Please select a column to remove');
        return;
    }
    
    if (confirm(`Are you sure you want to remove the "${columnName}" column? This will delete all data in this column.`)) {
        try {
            const response = await fetch(`/api/columns/${columnName}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await loadData();
            }
        } catch (error) {
            alert('Error removing column');
        }
    }
}

function updateRemoveColumnSelect() {
    const select = document.getElementById('removeColumnSelect');
    select.innerHTML = '<option value="">Select column to remove</option>';
    
    customColumns.forEach(col => {
        select.innerHTML += `<option value="${col.name}">${col.name}</option>`;
    });
}

// Render functions
function renderTeamsTable() {
    // Update header
    const header = document.getElementById('headTableHeader');
    header.innerHTML = `
        <th>Team & Members</th>
        <th>Abstract Copy</th>
        <th>Report Copy</th>
        <th>Presentation</th>
        ${customColumns.map(col => `<th>${col.name}</th>`).join('')}
        <th>Actions</th>
    `;
    
    const tbody = document.getElementById('teamsTableBody');
    tbody.innerHTML = '';
    
    teams.forEach(team => {
        const members = team.members.split(',').map(m => m.trim());
        
        // Team row (colored background)
        const teamCustomCells = customColumns.map(col => {
            if (col.type === 'team') {
                return `<td>${team[col.name] || '-'}</td>`;
            } else {
                return `<td>-</td>`;
            }
        }).join('');
        
        const teamRow = document.createElement('tr');
        teamRow.className = 'team-row';
        teamRow.innerHTML = `
            <td><strong>- ${team.name}</strong></td>
            <td>${team.abstractCopy}</td>
            <td>${team.reportCopy}</td>
            <td>${team.presentation}</td>
            ${teamCustomCells}
            <td rowspan="${members.length + 1}">
                <button onclick="deleteTeam('${team._id}')" class="btn btn-danger">Delete</button>
            </td>
        `;
        tbody.appendChild(teamRow);
        
        // Member rows
        members.forEach(member => {
            const memberCustomCells = customColumns.map(col => {
                if (col.type === 'individual') {
                    const value = team[col.name] && team[col.name][member] ? team[col.name][member] : '-';
                    return `<td>${value}</td>`;
                } else {
                    return `<td>-</td>`;
                }
            }).join('');
            
            const memberRow = document.createElement('tr');
            memberRow.className = 'member-row';
            memberRow.innerHTML = `
                <td>&gt; ${member}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                ${memberCustomCells}
            `;
            tbody.appendChild(memberRow);
        });
    });
}

function renderReviewerView() {
    // Update header
    const header = document.getElementById('reviewerTableHeader');
    header.innerHTML = `
        <th>Team & Members</th>
        <th>Abstract Copy</th>
        <th>Report Copy</th>
        <th>Presentation</th>
        ${customColumns.map(col => `<th>${col.name}</th>`).join('')}
    `;
    
    const tbody = document.getElementById('reviewTeamsTableBody');
    tbody.innerHTML = '';
    
    teams.forEach(team => {
        const members = team.members.split(',').map(m => m.trim());
        
        // Team row (colored background)
        const teamCustomCells = customColumns.map(col => {
            if (col.type === 'team') {
                return `<td><input type="text" value="${team[col.name] || ''}" onchange="updateTeamStatus('${team._id}', '${col.name}', this.value)" style="width: 100px;"></td>`;
            } else {
                return `<td>-</td>`;
            }
        }).join('');
        
        const teamRow = document.createElement('tr');
        teamRow.className = 'team-row';
        teamRow.innerHTML = `
            <td><strong>- ${team.name}</strong></td>
            <td>
                <select onchange="updateTeamStatus('${team._id}', 'abstractCopy', this.value)">
                    <option value="Pending" ${team.abstractCopy === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Submitted" ${team.abstractCopy === 'Submitted' ? 'selected' : ''}>Submitted</option>
                    <option value="Reviewed" ${team.abstractCopy === 'Reviewed' ? 'selected' : ''}>Reviewed</option>
                </select>
            </td>
            <td>
                <select onchange="updateTeamStatus('${team._id}', 'reportCopy', this.value)">
                    <option value="Pending" ${team.reportCopy === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Submitted" ${team.reportCopy === 'Submitted' ? 'selected' : ''}>Submitted</option>
                    <option value="Reviewed" ${team.reportCopy === 'Reviewed' ? 'selected' : ''}>Reviewed</option>
                </select>
            </td>
            <td>
                <select onchange="updateTeamStatus('${team._id}', 'presentation', this.value)">
                    <option value="Pending" ${team.presentation === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Scheduled" ${team.presentation === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                    <option value="Completed" ${team.presentation === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
            </td>
            ${teamCustomCells}
        `;
        tbody.appendChild(teamRow);
        
        // Member rows
        members.forEach(member => {
            const memberCustomCells = customColumns.map(col => {
                if (col.type === 'individual') {
                    const value = team[col.name] && team[col.name][member] ? team[col.name][member] : '';
                    return `<td><input type="text" value="${value}" onchange="updateMemberScore('${team._id}', '${col.name}', '${member}', this.value)" style="width: 80px;"></td>`;
                } else {
                    return `<td>-</td>`;
                }
            }).join('');
            
            const memberRow = document.createElement('tr');
            memberRow.className = 'member-row';
            memberRow.innerHTML = `
                <td>&gt; ${member}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                ${memberCustomCells}
            `;
            tbody.appendChild(memberRow);
        });
    });
}

function getStatusClass(status) {
    if (status === 'Pending') return 'status-pending';
    if (status === 'Reviewed' || status === 'Completed') return 'status-completed';
    return '';
}

// API functions
async function loadData() {
    try {
        const [teamsResponse, columnsResponse] = await Promise.all([
            fetch('/api/teams'),
            fetch('/api/columns')
        ]);
        
        teams = await teamsResponse.json();
        customColumns = await columnsResponse.json();
        
        renderTeamsTable();
        renderReviewerView();
        updateRemoveColumnSelect();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}