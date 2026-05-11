const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    req.role = decoded.role;
    req.name = decoded.name;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Start live session (teacher only)
router.post('/start', verifyToken, async (req, res) => {
  try {
    if (req.role !== 'teacher' && req.role !== 'staff') {
      return res.status(403).json({ error: 'Only teachers can start live sessions' });
    }
    
    const { courseId, courseCode, courseName } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const sessionId = uuidv4();
    
    // Store in global variable (from main server)
    if (!global.activeLiveSessions) {
      global.activeLiveSessions = new Map();
    }
    
    global.activeLiveSessions.set(sessionId, {
      sessionId,
      courseId,
      courseCode,
      courseName,
      teacherId: req.userId,
      teacherName: req.name,
      students: new Map(),
      startTime: new Date(),
      isActive: true,
      chatHistory: []
    });
    
    res.json({
      sessionId,
      message: 'Live session started successfully'
    });
  } catch (error) {
    console.error('Error starting live session:', error);
    res.status(500).json({ error: error.message });
  }
});

// End live session
router.post('/end', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = global.activeLiveSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (session.teacherId !== req.userId && req.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to end this session' });
    }
    
    session.isActive = false;
    
    // Schedule cleanup
    setTimeout(() => {
      global.activeLiveSessions.delete(sessionId);
    }, 5000);
    
    res.json({ message: 'Live session ended successfully' });
  } catch (error) {
    console.error('Error ending live session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session info
router.get('/session/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = global.activeLiveSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      sessionId: session.sessionId,
      courseId: session.courseId,
      courseCode: session.courseCode,
      courseName: session.courseName,
      teacherName: session.teacherName,
      startTime: session.startTime,
      isActive: session.isActive,
      participantCount: session.students.size,
      chatHistory: session.chatHistory.slice(-50)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all active sessions
router.get('/active', verifyToken, async (req, res) => {
  try {
    const sessions = Array.from(global.activeLiveSessions.values())
      .filter(session => session.isActive)
      .map(session => ({
        sessionId: session.sessionId,
        courseId: session.courseId,
        courseCode: session.courseCode,
        courseName: session.courseName,
        teacherName: session.teacherName,
        participantCount: session.students.size,
        startTime: session.startTime
      }));
    
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;