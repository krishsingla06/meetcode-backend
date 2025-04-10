// });

const express = require("express");
const mongoose = require("mongoose");

let a = await mongoose.connect("mongodb://localhost:27017");

const app = express();
const PORT = 3000;

const path = require("path");
app.use("/static", express.static(path.join(__dirname, "static")));

app.use(express.json());
app.post("/recievename", (req, res) => {
  const { name } = req.body;

  res.send(`Welcome ${name}`);
});

app.listen(PORT, (error) => {
  if (!error) {
    console.log(
      "Server is Successfully Running, and App is listening on port " + PORT
    );
  } else {
    console.log("Error occurred, server can't start", error);
  }
});

app.get("/", (req, res) => {
  res.status(200);
  res.send("Welcome to root URL of Server updated");
});

// app.use((req, res) => {
//   res.send("<h1>Hello, World!</h1>"); // default response to any request
// });

app.get("/file", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "2.png"));
});

app.get("/hello", (req, res) => {
  res.set("Content-Type", "text/html");
  res.status(200).send("<h1>Hello GFG Learner!</h1>");
});

module.exports = app;
