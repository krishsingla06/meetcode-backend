import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios"; // Importing axios for HTTP requests
import { Server } from "socket.io";
import http from "http";

dotenv.config();

const app = express();
const JWT_SECRET = "12345";
const PORT = 8000;
const BASE_URL = process.env.FRONTEND_URL;
const uri = `mongodb+srv://arnavvv:C14hMPSHTpdcB5vq@arnavvv.isvph.mongodb.net/JEE`;
const client = new MongoClient(uri);

console.log("BASE_URL =", BASE_URL);

const server = http.createServer(app);

await client.connect();

const corsOptions = {
  origin: BASE_URL,
  methods: "GET, POST, PUT, DELETE",
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: BASE_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const usersInRoom = {};
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.on("join-room", async (repoCode, username) => {
    socket.join(repoCode);
    if (!usersInRoom[repoCode]) usersInRoom[repoCode] = [];
    usersInRoom[repoCode].push({ id: socket.id, name: username });
  
    // Fetch and send existing files
    const db = client.db("Jee");
    const filesCollection = db.collection("files");
    const existingFiles = await filesCollection
      .find({ repoCode })
      .project({ _id: 0, filename: 1, content: 1 })
      .toArray();
    
      socket.emit("initial-files", existingFiles.map(f => ({
        ...f,
        path: f.filename
      })));
  
    io.to(repoCode).emit("update-users", usersInRoom[repoCode]);
    console.log(`User ${socket.id} joined room ${repoCode}`);
  });
  

  socket.on("code-change", async ({ repoCode, filename, code }) => {
    const db = client.db("Jee");
    const filesCollection = db.collection("files");
  
    await filesCollection.updateOne(
      { repoCode, filename },
      { $set: { content: code } },
      { upsert: true }
    );
  
    socket.to(repoCode).emit("code-update", { filename, code });
  });
  

  socket.on("file-created", async ({ repoCode, file }) => {
    const db = client.db("Jee");
    const filesCollection = db.collection("files");
  
    const result = await filesCollection.updateOne(
      { repoCode, filename: file },
      { $setOnInsert: { content: "" } },
      { upsert: true }
    );
  
    const newFile = await filesCollection.findOne(
      { repoCode, filename: file },
      { projection: { _id: 0, filename: 1, content: 1 } }
    );
    
    io.to(repoCode).emit("file-created", newFile);
  });
  
  

  socket.on("file-deleted", async ({ repoCode, filePath }) => {
    const db = client.db("Jee");
    const filesCollection = db.collection("files");
  
    await filesCollection.deleteOne({ repoCode, filename: filePath });
  
    socket.to(repoCode).emit("file-deleted", { filePath });
  });
  

  socket.on("disconnect", () => {
    for (const room in usersInRoom) {
      usersInRoom[room] = usersInRoom[room].filter(
        (user) => user.id !== socket.id
      );
      io.to(room).emit("update-users", usersInRoom[room]);
    }
    console.log("User disconnected", socket.id);
  });
});

app.use(express.json());
app.use(cors(corsOptions));

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token not provided" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(403).json({ message: "Invalid token", error: err });
    req.username = decoded.username;
    next();
  });
}

app.get("/", (req, res) => {
  console.log("path = /");
  res.status(200).send("Welcome to the root URL of Meet Code Server");
});

// Existing routes for signup, login, etc. ...
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const db = client.db("Jee");
  const usersCollection = db.collection("users");
  try {
    const userExists = await usersCollection.findOne({ username });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, password: hashedPassword };
    await usersCollection.insertOne(newUser);
    res.status(200).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const db = client.db("Jee");
  const usersCollection = db.collection("users");
  try {
    const user = await usersCollection.findOne({ username });
    if (!user)
      return res.status(400).json({ message: "User not found" });
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return res.status(400).json({ message: "Incorrect password" });
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({
      message: "Login successful",
      token,
      username: user.username,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

app.post("/api/repos/create", authenticateToken, async (req, res) => {
  const { repoName, roomPassword } = req.body;
  if (!repoName || !roomPassword)
    return res
      .status(400)
      .json({ success: false, message: "Repository name and password required" });
  const db = client.db("Jee");
  const reposCollection = db.collection("repos");
  try {
    const hashedRoomPassword = await bcrypt.hash(roomPassword, 10);
    const repoCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newRepo = {
      repoName,
      roomPassword: hashedRoomPassword,
      repoCode,
      createdBy: req.username,
      createdAt: new Date(),
    };
    await reposCollection.insertOne(newRepo);
    res.status(200).json({
      success: true,
      message: "Repository created successfully",
      repoName,
      repoCode,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
});

app.get("/api/repos", authenticateToken, async (req, res) => {
  const db = client.db("Jee");
  const reposCollection = db.collection("repos");
  try {
    const repos = await reposCollection.find({ createdBy: req.username }).toArray();
    res.status(200).json({ success: true, repos });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
});
app.get("/test", (req, res) => {
  console.log("Test route hit");
  res.status(200).json({ message: "Server is working" });
});

app.post("/api/repos/join", authenticateToken, async (req, res) => {
  const { joinCode } = req.body;
  if (!joinCode)
    return res.status(400).json({ success: false, message: "Join code is required" });
  const db = client.db("Jee");
  const reposCollection = db.collection("repos");
  try {
    const repo = await reposCollection.findOne({ repoCode: joinCode });
    if (!repo)
      return res.status(400).json({ success: false, message: "Repository not found" });
    res.status(200).json({
      success: true,
      message: "Repository found",
      repoName: repo.repoName,
      repoCode: repo.repoCode,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
});
// New route to execute code using Judge0 API
app.post("/api/run-code", authenticateToken, async (req, res) => {
  const { code, language, stdin } = req.body;

  if (!code || !language) {
    return res.status(400).json({
      success: false,
      message: "Code and language are required",
    });
  }

  const languageMap = {
    python: 71,
    javascript: 63,
    cpp: 54,
    java: 62,
  };

  const languageId = languageMap[language];
  if (!languageId) {
    return res.status(400).json({
      success: false,
      message: "Unsupported language",
    });
  }

  try {
    // Step 1: Submit code
    const submissionResponse = await axios.post(
      'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true',
      {
        language_id: languageId,
        source_code: code,
        stdin: stdin,
      },
      {
        headers: {
          'content-type': 'application/json',
          'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
          'x-rapidapi-key': '2017184a89msh00d02f7b84ef328p117473jsnce88478ea638', // Replace with valid RapidAPI key
        },
      }
    );

    const result = submissionResponse.data;
    console.log(result);
    if (result.stderr) {
      return res.status(500).json({
        success: false,
        message: "Runtime Error",
        error: result.stderr,
      });
    }

    if (result.compile_output) {
      return res.status(500).json({
        success: false,
        message: "Compilation Error",
        error: result.compile_output,
      });
    }

    return res.status(200).json({
      success: true,
      output: result.stdout,
    });

  } catch (error) {
    console.error("Execution error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || "Something went wrong",
      error: error.message,
    });
  }
});

app.get("/api/repos/:repoCode/files", authenticateToken, async (req, res) => {
  const { repoCode } = req.params;
  const db = client.db("Jee");
  const filesCollection = db.collection("files");

  try {
    const files = await filesCollection
      .find({ repoCode })
      .project({ _id: 0, filename: 1, content: 1 })
      .toArray();

    res.status(200).json({ success: true, files });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch files",
      error,
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://10.81.78.12:${PORT}`);
});