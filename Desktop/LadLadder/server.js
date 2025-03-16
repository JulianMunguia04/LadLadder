const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5000",
  },
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  console.log("Route / accessed");  // Debugging log
  res.send("index");
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/test", (req, res) => {
  console.log("Route / accessed");  // Debugging log
  res.render("index", { title: "Test Page" });
});



io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
