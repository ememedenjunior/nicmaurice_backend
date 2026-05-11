require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const db = require("./model/connect");
const { createSuperAdmin } = require("./controllers/admin");
db();

const server = express();

// Create HTTP server for Socket.IO
const httpServer = http.createServer(server);

// Initialize Socket.IO
const io = socketIO(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Store active live sessions
global.activeLiveSessions = new Map();

// Socket.IO middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    socket.userId = decoded.userId;
    socket.role = decoded.role;
    socket.name = decoded.name;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId} (${socket.role})`);

  // Teacher: Start a live session
  socket.on('teacher:start-session', async (data) => {
    try {
      const { courseId, courseCode, courseName } = data;
      const { v4: uuidv4 } = require('uuid');
      const sessionId = uuidv4();
      
      // Store session information
      global.activeLiveSessions.set(sessionId, {
        sessionId,
        courseId,
        courseCode,
        courseName,
        teacherId: socket.userId,
        teacherSocketId: socket.id,
        teacherName: socket.name,
        students: new Map(),
        startTime: new Date(),
        isActive: true,
        chatHistory: []
      });

      // Join teacher to session room
      socket.join(`session:${sessionId}`);
      
      // Emit session started event
      socket.emit('session:started', {
        sessionId,
        courseId,
        courseCode,
        courseName
      });
      
      // Broadcast to all students that a new session has started
      io.emit(`course:${courseId}:session-started`, {
        sessionId,
        courseCode,
        courseName,
        teacherName: socket.name
      });
      
      console.log(`Live session started: ${sessionId} for course ${courseCode}`);
    } catch (error) {
      console.error('Error starting session:', error);
      socket.emit('error', { message: 'Failed to start session' });
    }
  });

  // Student: Join a live session
  socket.on('student:join-session', async (data) => {
    try {
      const { sessionId, studentId, studentName } = data;
      const session = global.activeLiveSessions.get(sessionId);
      
      if (!session || !session.isActive) {
        socket.emit('error', { message: 'Session not found or ended' });
        return;
      }
      
      // Add student to session
      session.students.set(socket.id, {
        socketId: socket.id,
        studentId: studentId || socket.userId,
        studentName: studentName || socket.name,
        joinedAt: new Date()
      });
      
      // Join student to session room
      socket.join(`session:${sessionId}`);
      
      // Notify teacher about new student
      io.to(session.teacherSocketId).emit('teacher:student-joined', {
        studentId: studentId || socket.userId,
        studentName: studentName || socket.name,
        totalStudents: session.students.size
      });
      
      // Send chat history to student
      socket.emit('session:chat-history', session.chatHistory);
      
      // Send current participant count
      socket.emit('session:participant-count', session.students.size);
      
      // Broadcast updated participant count to all in session
      io.to(`session:${sessionId}`).emit('session:participants-updated', {
        count: session.students.size
      });
      
      console.log(`Student ${studentName || socket.name} joined session ${sessionId}`);
    } catch (error) {
      console.error('Error joining session:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  // WebRTC Signaling
  socket.on('webrtc:offer', async (data) => {
    try {
      const { sessionId, targetUserId, offer } = data;
      const session = global.activeLiveSessions.get(sessionId);
      
      if (!session) return;
      
      // Forward offer to target user
      const targetSocket = io.sockets.sockets.get(targetUserId);
      if (targetSocket) {
        targetSocket.emit('webrtc:offer', {
          from: socket.id,
          offer
        });
      }
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
    }
  });

  socket.on('webrtc:answer', async (data) => {
    try {
      const { sessionId, targetUserId, answer } = data;
      const session = global.activeLiveSessions.get(sessionId);
      
      if (!session) return;
      
      const targetSocket = io.sockets.sockets.get(targetUserId);
      if (targetSocket) {
        targetSocket.emit('webrtc:answer', {
          from: socket.id,
          answer
        });
      }
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
    }
  });

  socket.on('webrtc:ice-candidate', async (data) => {
    try {
      const { sessionId, targetUserId, candidate } = data;
      const session = global.activeLiveSessions.get(sessionId);
      
      if (!session) return;
      
      const targetSocket = io.sockets.sockets.get(targetUserId);
      if (targetSocket) {
        targetSocket.emit('webrtc:ice-candidate', {
          from: socket.id,
          candidate
        });
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  });

  // Teacher: Toggle video/audio
  socket.on('teacher:toggle-video', (data) => {
    const { sessionId, enabled } = data;
    const session = global.activeLiveSessions.get(sessionId);
    
    if (session && session.isActive) {
      io.to(`session:${sessionId}`).emit('teacher:video-status', { enabled });
    }
  });

  socket.on('teacher:toggle-audio', (data) => {
    const { sessionId, enabled } = data;
    const session = global.activeLiveSessions.get(sessionId);
    
    if (session && session.isActive) {
      io.to(`session:${sessionId}`).emit('teacher:audio-status', { enabled });
    }
  });

  // Screen sharing
  socket.on('teacher:screen-share', (data) => {
    const { sessionId, sharing, streamId } = data;
    const session = global.activeLiveSessions.get(sessionId);
    
    if (session && session.isActive) {
      io.to(`session:${sessionId}`).emit('teacher:screen-share-status', {
        sharing,
        streamId
      });
    }
  });

  // Chat message
  socket.on('chat:message', async (data) => {
    try {
      const { sessionId, message, isTeacher } = data;
      const session = global.activeLiveSessions.get(sessionId);
      
      if (!session || !session.isActive) return;
      
      const { v4: uuidv4 } = require('uuid');
      const chatMessage = {
        id: uuidv4(),
        sender: isTeacher ? session.teacherName : socket.name,
        senderId: socket.userId,
        message,
        timestamp: new Date().toISOString(),
        isTeacher: isTeacher || false
      };
      
      // Store message in session history
      session.chatHistory.push(chatMessage);
      
      // Keep only last 200 messages
      if (session.chatHistory.length > 200) {
        session.chatHistory = session.chatHistory.slice(-200);
      }
      
      // Broadcast to all in session
      io.to(`session:${sessionId}`).emit('chat:new-message', chatMessage);
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  });

  // Teacher: End session
  socket.on('teacher:end-session', async (data) => {
    try {
      const { sessionId } = data;
      const session = global.activeLiveSessions.get(sessionId);
      
      if (session && session.teacherSocketId === socket.id) {
        session.isActive = false;
        
        // Notify all students that session has ended
        io.to(`session:${sessionId}`).emit('session:ended', {
          sessionId,
          message: 'The live session has ended'
        });
        
        // Remove session after delay
        setTimeout(() => {
          global.activeLiveSessions.delete(sessionId);
        }, 5000);
        
        console.log(`Session ${sessionId} ended by teacher`);
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  });

  // Student: Leave session
  socket.on('student:leave-session', (data) => {
    const { sessionId } = data;
    const session = global.activeLiveSessions.get(sessionId);
    
    if (session && session.isActive) {
      const student = session.students.get(socket.id);
      if (student) {
        session.students.delete(socket.id);
        
        // Notify teacher
        io.to(session.teacherSocketId).emit('teacher:student-left', {
          studentId: student.studentId,
          studentName: student.studentName,
          totalStudents: session.students.size
        });
        
        // Broadcast updated participant count
        io.to(`session:${sessionId}`).emit('session:participants-updated', {
          count: session.students.size
        });
      }
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    
    // Check if this was a teacher with an active session
    for (const [sessionId, session] of global.activeLiveSessions) {
      if (session.teacherSocketId === socket.id && session.isActive) {
        // Teacher disconnected unexpectedly, end the session
        session.isActive = false;
        io.to(`session:${sessionId}`).emit('session:ended', {
          sessionId,
          message: 'Teacher has disconnected. Session ended.'
        });
        
        setTimeout(() => {
          global.activeLiveSessions.delete(sessionId);
        }, 5000);
        
        console.log(`Session ${sessionId} ended due to teacher disconnection`);
      } else if (session.students.has(socket.id)) {
        // Student disconnected
        const student = session.students.get(socket.id);
        session.students.delete(socket.id);
        
        if (session.isActive) {
          io.to(session.teacherSocketId).emit('teacher:student-left', {
            studentId: student.studentId,
            studentName: student.studentName,
            totalStudents: session.students.size
          });
          
          io.to(`session:${sessionId}`).emit('session:participants-updated', {
            count: session.students.size
          });
        }
      }
    }
  });
});

//Server level middleware
server.use(helmet());
server.use(express.json());
server.use(express.urlencoded({ extended: false }));
server.use(
  cors({
    origin: "*",
  }),
);

//Application routes
server.use("/admin", require("./routes/admin"));
server.use("/applicant", require("./routes/applicant"));
server.use("/student", require("./routes/student"));
server.use("/staff", require("./routes/teacher"));
server.use("/registrar", require("./routes/registrar"));

// Live Class Routes
server.use("/api/live", require("./routes/liveClassRoutes"));

// Get active sessions endpoint
server.get("/api/live/active-sessions", (req, res) => {
  try {
    const sessions = Array.from(global.activeLiveSessions.values())
      .filter(session => session.isActive)
      .map(session => ({
        sessionId: session.sessionId,
        courseId: session.courseId,
        courseCode: session.courseCode,
        courseName: session.courseName,
        participantCount: session.students.size,
        startTime: session.startTime,
        teacherName: session.teacherName
      }));
    
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if course has active session
server.get("/api/live/course/:courseId/active", (req, res) => {
  try {
    const { courseId } = req.params;
    const activeSession = Array.from(global.activeLiveSessions.values()).find(
      session => session.courseId === courseId && session.isActive
    );
    
    if (activeSession) {
      res.json({
        isLive: true,
        sessionId: activeSession.sessionId,
        courseCode: activeSession.courseCode,
        courseName: activeSession.courseName,
        participantCount: activeSession.students.size,
        teacherName: activeSession.teacherName
      });
    } else {
      res.json({ isLive: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session details
server.get("/api/live/session/:sessionId", (req, res) => {
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

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
  console.log(`Socket.IO server ready for live classes`);
});
