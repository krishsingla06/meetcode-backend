import express from "express";
const app = express();
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = "12345";

const PORT = 8000;
const uri = `mongodb://127.0.0.1:27017`;
import { MongoClient } from "mongodb";
import cors from "cors";
const client = new MongoClient(uri);
await client.connect();
const corsOptions = {
  origin: "http://localhost:3000",
  method: "GET, POST, PUT, DELETE",
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  console.log("path = /");
  res.status(200);
  res.send("Welcome to root URL of Server updated");
});

// Route to handle user registration (Sign-up)
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const db = client.db("Jee");
  const usersCollection = db.collection("users");

  try {
    // Check if user already exists in the database
    const userExists = await usersCollection.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store the user in the database
    const newUser = { username, password: hashedPassword };
    await usersCollection.insertOne(newUser);

    // Respond with success
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
    // Check if user already exists in the database
    const userExists = await usersCollection.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store the user in the database
    const newUser = { username, password: hashedPassword };
    await usersCollection.insertOne(newUser);

    // Respond with success
    res.status(200).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

// Route to handle user login
app.post("/login", async (req, res) => {
  console.log("called login");
  const { username, password } = req.body;
  const db = client.db("Jee");
  const usersCollection = db.collection("users");

  try {
    // Find the user by username in the database
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Compare the password with the hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    // Generate JWT token for authentication
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "1h",
    });

    // Respond with the token
    res.status(200).json({ message: "Login successful", token, username });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

// Route to handle user login
app.post("/loginadmin", async (req, res) => {
  console.log("called loginadmin");
  const { username, password } = req.body;
  const db = client.db("Jee");
  const usersCollection = db.collection("admins");

  try {
    // Find the user by username in the database
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Compare the password with the hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    // Generate JWT token for authentication
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "1h",
    });

    // Respond with the token
    res.status(200).json({ message: "Login successful", token, username });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

// Start the Express server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
});
