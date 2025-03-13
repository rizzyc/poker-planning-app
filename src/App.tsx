import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import './App.css';

// Type definitions
interface Member {
  name: string;
  isAdmin: boolean;
  isVotingMember: boolean;
  vote: string | number | null;
}

interface Room {
  id: string;
  admin: string;
  adminIsVoting: boolean;
  members: Member[];
  showVotes: boolean;
  topic?: string;
  created: string;
}

// Main App Component
function App(): JSX.Element {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Scrum Poker Planning</h1>
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<PlanningRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

// Home Component for creating a new planning session
function Home(): JSX.Element {
  const [name, setName] = useState<string>('');
  const [isAdmin] = useState<boolean>(true);
  const [isVotingMember, setIsVotingMember] = useState<boolean>(true);
  const navigate = useNavigate();

  // Check for saved name in localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const createRoom = (): void => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    // Save user name to localStorage
    localStorage.setItem('userName', name);
    
    // Generate a unique room ID
    const roomId = nanoid(10);
    
    // Create room in localStorage
    const room: Room = {
      id: roomId,
      admin: name,
      adminIsVoting: isVotingMember,
      members: [{
        name: name,
        isAdmin: true,
        isVotingMember: isVotingMember,
        vote: null
      }],
      showVotes: false,
      created: new Date().toISOString()
    };
    
    localStorage.setItem(`room_${roomId}`, JSON.stringify(room));
    
    // Redirect to the room
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Create a Planning Session</h2>
        <div className="form-group">
          <label htmlFor="name">Your Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>
        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="isVotingMember"
            checked={isVotingMember}
            onChange={(e) => setIsVotingMember(e.target.checked)}
          />
          <label htmlFor="isVotingMember">I will vote (uncheck if you're just facilitating)</label>
        </div>
        <button className="primary-button" onClick={createRoom}>
          Create Session
        </button>
      </div>
    </div>
  );
}

// Planning Room Component
function PlanningRoom(): JSX.Element {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>('');
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [selectedVote, setSelectedVote] = useState<string | number | null>(null);
  const [topic, setTopic] = useState<string>('');

  // Available vote options (Fibonacci + coffee)
  const voteOptions: (number | string)[] = [1, 2, 3, 5, 8, 13, 21, '☕'];

  // Load room data
  useEffect(() => {
    if (!roomId) return;
    
    const roomData = localStorage.getItem(`room_${roomId}`);
    if (roomData) {
      setRoom(JSON.parse(roomData));
    } else {
      alert('Room not found!');
      navigate('/');
    }

    // Get user name from localStorage
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setName(savedName);
    }
    
    setLoading(false);
  }, [roomId, navigate]);

  // Poll for updates every 2 seconds
  useEffect(() => {
    if (!isJoined || !roomId) return;
    
    const interval = setInterval(() => {
      const roomData = localStorage.getItem(`room_${roomId}`);
      if (roomData) {
        setRoom(JSON.parse(roomData));
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isJoined, roomId]);

  // Join the room
  const joinRoom = (): void => {
    if (!name.trim() || !room || !roomId) {
      alert('Please enter your name');
      return;
    }

    localStorage.setItem('userName', name);
    
    // Update room data
    const updatedRoom = { ...room };
    
    // Check if user already exists in the room
    const existingMemberIndex = updatedRoom.members.findIndex(m => m.name === name);
    
    if (existingMemberIndex === -1) {
      // Add new member if not exists
      if (updatedRoom.members.length >= 25) {
        alert('This room has reached the maximum capacity of 25 members');
        return;
      }
      
      updatedRoom.members.push({
        name: name,
        isAdmin: false,
        isVotingMember: true,
        vote: null
      });
    }
    
    // Save updated room
    localStorage.setItem(`room_${roomId}`, JSON.stringify(updatedRoom));
    setRoom(updatedRoom);
    setIsJoined(true);
  };

  // Handle vote selection
  const handleVote = (vote: number | string): void => {
    if (!room || !roomId) return;
    
    const updatedRoom = { ...room };
    const memberIndex = updatedRoom.members.findIndex(m => m.name === name);
    
    if (memberIndex !== -1) {
      updatedRoom.members[memberIndex].vote = vote;
      localStorage.setItem(`room_${roomId}`, JSON.stringify(updatedRoom));
      setRoom(updatedRoom);
      setSelectedVote(vote);
    }
  };

  // Toggle show/hide votes
  const toggleShowVotes = (): void => {
    if (!isAdmin() || !room || !roomId) return;
    
    const updatedRoom = { ...room };
    updatedRoom.showVotes = !updatedRoom.showVotes;
    localStorage.setItem(`room_${roomId}`, JSON.stringify(updatedRoom));
    setRoom(updatedRoom);
  };

  // Reset votes for a new round
  const resetVotes = (): void => {
    if (!isAdmin() || !room || !roomId) return;
    
    const updatedRoom = { ...room };
    updatedRoom.members.forEach(member => {
      member.vote = null;
    });
    updatedRoom.showVotes = false;
    localStorage.setItem(`room_${roomId}`, JSON.stringify(updatedRoom));
    setRoom(updatedRoom);
    setSelectedVote(null);
    setTopic('');
  };

  // Update topic
  const updateTopic = (): void => {
    if (!isAdmin() || !room || !roomId) return;
    
    const updatedRoom = { ...room };
    updatedRoom.topic = topic;
    localStorage.setItem(`room_${roomId}`, JSON.stringify(updatedRoom));
    setRoom(updatedRoom);
  };

  // Toggle voting status for a member
  const toggleVotingStatus = (memberName: string): void => {
    if (!isAdmin() || !room || !roomId) return;
    
    const updatedRoom = { ...room };
    const memberIndex = updatedRoom.members.findIndex(m => m.name === memberName);
    
    if (memberIndex !== -1) {
      updatedRoom.members[memberIndex].isVotingMember = !updatedRoom.members[memberIndex].isVotingMember;
      
      // If the member is the admin, update adminIsVoting as well
      if (memberName === updatedRoom.admin) {
        updatedRoom.adminIsVoting = updatedRoom.members[memberIndex].isVotingMember;
      }
      
      localStorage.setItem(`room_${roomId}`, JSON.stringify(updatedRoom));
      setRoom(updatedRoom);
    }
  };

  // Check if current user is admin
  const isAdmin = (): boolean => {
    return Boolean(room && room.admin === name);
  };

  // Check if current user is a voting member
  const isVotingMember = (): boolean => {
    if (!room) return false;
    const member = room.members.find(m => m.name === name);
    return Boolean(member && member.isVotingMember);
  };

  // Get vote statistics
  interface VoteStats {
    counts: { [key: string]: number };
    average: string;
    totalVotes: number;
    totalVoters: number;
  }

  const getVoteStats = (): VoteStats | null => {
    if (!room) return null;
    
    const votingMembers = room.members.filter(m => m.isVotingMember);
    const votes = votingMembers.map(m => m.vote).filter((v): v is string | number => v !== null);
    
    if (votes.length === 0) return null;
    
    // Count votes
    const voteCounts: { [key: string]: number } = {};
    voteOptions.forEach(option => {
      voteCounts[option.toString()] = 0;
    });
    
    votes.forEach(vote => {
      voteCounts[vote.toString()] = (voteCounts[vote.toString()] || 0) + 1;
    });
    
    // Calculate average (excluding coffee)
    const numericVotes = votes.filter((v): v is number => v !== '☕').map(v => Number(v));
    const average = numericVotes.length > 0 
      ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length 
      : 0;
    
    return {
      counts: voteCounts,
      average: average.toFixed(1),
      totalVotes: votes.length,
      totalVoters: votingMembers.length
    };
  };

  // Render loading state
  if (loading) {
    return <div className="container">Loading...</div>;
  }

  // Render join form if not joined
  if (!isJoined) {
    return (
      <div className="container">
        <div className="card">
          <h2>Join Planning Session</h2>
          <div className="form-group">
            <label htmlFor="joinName">Your Name:</label>
            <input
              type="text"
              id="joinName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <button className="primary-button" onClick={joinRoom}>
            Join Session
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return <div className="container">Room not found</div>;
  }

  // Get vote statistics
  const voteStats = getVoteStats();

  return (
    <div className="container">
      <div className="room-info">
        <h2>{room.topic || 'Planning Session'}</h2>
        <div className="room-actions">
          <button 
            className="copy-button" 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Room link copied to clipboard!');
            }}
          >
            Copy Room Link
          </button>
          {isAdmin() && (
            <>
              <div className="topic-input">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter topic/story"
                />
                <button onClick={updateTopic}>Set Topic</button>
              </div>
              <button 
                className="primary-button" 
                onClick={toggleShowVotes}
              >
                {room.showVotes ? 'Hide Votes' : 'Show Votes'}
              </button>
              <button 
                className="secondary-button" 
                onClick={resetVotes}
              >
                New Round
              </button>
            </>
          )}
        </div>
      </div>

      <div className="room-content">
        <div className="voting-area">
          <h3>Your Vote</h3>
          {isVotingMember() ? (
            <div className="vote-options">
              {voteOptions.map((option) => (
                <button
                  key={option.toString()}
                  className={`vote-button ${selectedVote === option ? 'selected' : ''}`}
                  onClick={() => handleVote(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <p>You are set as a non-voting member.</p>
          )}
        </div>

        {room.showVotes && voteStats && (
          <div className="results-area">
            <h3>Vote Results</h3>
            <div className="stats">
              <div className="average">
                <span>Average:</span> {voteStats.average}
              </div>
              <div className="progress">
                {voteStats.totalVotes} / {voteStats.totalVoters} votes
              </div>
            </div>
            <div className="vote-chart">
              {voteOptions.map((option) => {
                const count = voteStats.counts[option.toString()] || 0;
                const percentage = voteStats.totalVoters > 0 
                  ? (count / voteStats.totalVoters) * 100 
                  : 0;
                
                return (
                  <div key={option.toString()} className="vote-bar">
                    <div className="vote-label">{option}</div>
                    <div className="vote-bar-container">
                      <div 
                        className="vote-bar-fill" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="vote-count">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="members-area">
          <h3>Participants ({room.members.length}/25)</h3>
          <ul className="member-list">
            {room.members.map((member, index) => (
              <li key={index} className="member-item">
                <div className="member-info">
                  <span className="member-name">
                    {member.name} 
                    {member.isAdmin && <span className="admin-badge">Admin</span>}
                    {!member.isVotingMember && <span className="observer-badge">Observer</span>}
                  </span>
                  <span className="member-vote">
                    {room.showVotes 
                      ? (member.vote || '-') 
                      : (member.vote ? '✓' : '-')}
                  </span>
                </div>
                {isAdmin() && (
                  <button 
                    className="toggle-voting-button" 
                    onClick={() => toggleVotingStatus(member.name)}
                  >
                    {member.isVotingMember ? 'Set as Observer' : 'Set as Voter'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
