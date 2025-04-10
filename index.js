import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";
import cors from "cors";

const app = express();
const JWT_SECRET = "12345";
const PORT = 8000;
import dotenv from "dotenv";
dotenv.config();

const BASE_URL = process.env.FRONTEND_URL;
const uri = `mongodb+srv://arnavvv:C14hMPSHTpdcB5vq@arnavvv.isvph.mongodb.net/JEE`;

const client = new MongoClient(uri);
await client.connect();

const corsOptions = {
  origin: BASE_URL,
  methods: "GET, POST, PUT, DELETE",
  credentials: true,
};

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

app.post("/signup", async (req, res) => {
  console.log("called signup");
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
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

app.post("/signupadmin", async (req, res) => {
  const { username, password } = req.body;
  const db = client.db("Jee");
  const usersCollection = db.collection("admins");

  try {
    const userExists = await usersCollection.findOne({ username });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, password: hashedPassword };
    await usersCollection.insertOne(newUser);

    res.status(200).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

app.post("/login", async (req, res) => {
  console.log("called login");
  const { username, password } = req.body;
  const db = client.db("Jee");
  const usersCollection = db.collection("users");

  try {
    const user = await usersCollection.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return res.status(400).json({ message: "Incorrect password" });

    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res
      .status(200)
      .json({ message: "Login successful", token, username: user.username });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

app.post("/loginadmin", async (req, res) => {
  console.log("called loginadmin");
  const { username, password } = req.body;
  const db = client.db("Jee");
  const usersCollection = db.collection("admins");

  try {
    const user = await usersCollection.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return res.status(400).json({ message: "Incorrect password" });

    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res
      .status(200)
      .json({ message: "Login successful", token, username: user.username });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

app.post("/api/repos/create", authenticateToken, async (req, res) => {
  const { repoName, roomPassword } = req.body;
  if (!repoName || !roomPassword) {
    return res.status(400).json({
      success: false,
      message: "Repository name and password required",
    });
  }

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
    console.error("Error creating repository:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error,
    });
  }
});

app.get("/api/repos", authenticateToken, async (req, res) => {
  const db = client.db("Jee");
  const reposCollection = db.collection("repos");

  try {
    const repos = await reposCollection
      .find({ createdBy: req.username })
      .toArray();
    res.status(200).json({ success: true, repos });
  } catch (error) {
    console.error("Error fetching repositories:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error,
    });
  }
});

app.post("/api/repos/join", authenticateToken, async (req, res) => {
  const { joinCode } = req.body;
  if (!joinCode) {
    return res.status(400).json({
      success: false,
      message: "Join code is required",
    });
  }

  const db = client.db("Jee");
  const reposCollection = db.collection("repos");

  try {
    const repo = await reposCollection.findOne({ repoCode: joinCode });
    if (!repo) {
      return res.status(400).json({
        success: false,
        message: "Repository not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Repository found",
      repoName: repo.repoName,
      repoCode: repo.repoCode,
    });
  } catch (error) {
    console.error("Error joining repository:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://10.81.78.12:${PORT}`);
});
