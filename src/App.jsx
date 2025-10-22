import { useState, useEffect } from 'react'
import Login from './components/Login'
import HeadDashboard from './components/HeadDashboard'
import ReviewerDashboard from './components/ReviewerDashboard'
import StudentDashboard from './components/StudentDashboard'
import './App.css'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [teams, setTeams] = useState([])
  const [customColumns, setCustomColumns] = useState([])

  const loadData = async () => {
    try {
      const [teamsResponse, columnsResponse] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/columns')
      ])
      
      const teamsData = await teamsResponse.json()
      const columnsData = await columnsResponse.json()
      
      setTeams(teamsData)
      setCustomColumns(columnsData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  useEffect(() => {
    // Check for saved user session
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
    
    // Initialize default head user
    fetch('/api/init').then(() => {
      loadData()
    })
  }, [])

  const logout = () => {
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
  }

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {currentUser.role === 'head' ? (
        <HeadDashboard 
          teams={teams}
          customColumns={customColumns}
          currentUser={currentUser}
          onLogout={logout}
          onDataChange={loadData}
        />
      ) : currentUser.role === 'student' ? (
        <StudentDashboard 
          teams={teams}
          currentUser={currentUser}
          onLogout={logout}
        />
      ) : (
        <ReviewerDashboard 
          teams={teams}
          customColumns={customColumns}
          currentUser={currentUser}
          onLogout={logout}
          onDataChange={loadData}
        />
      )}
    </div>
  )
}

export default App