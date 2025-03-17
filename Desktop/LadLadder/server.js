const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const mongoose = require('mongoose')

const Room = require('./models/roomModel');

const uri = "mongodb://localhost:27017/ladladder";

mongoose.connect(uri)
  .then(() => {
    console.log("Connected to database: LadLadder");
  })
  .catch(err => {
    console.error("Error connecting to database:", err);
  });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5000",
  },
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", async (req, res) => {
  const room = await Room.find()
  console.log(room)
  res.sendFile(path.join(__dirname,"public/index.html"));
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/test", (req, res) => {
  console.log("Route / accessed");  // Debugging log
  res.render("index", { title: "Test Page" });
});

//Create new game
app.get("/host", async (req, res) => {
  try {
    const code = await createNewRoom();
    res.redirect(`/host/${code}`);
  } catch (error) {
    console.error('Error in /host route:', error);
    res.status(500).send('Error creating room');
  }
});

app.get("/host/:roomCode", async (req, res) => {
  const roomCode = req.params.roomCode;
  
  try {
    const currentRoom = await Room.findOne({ room: roomCode });
    
    if (currentRoom && !currentRoom.admin) {
      currentRoom.admin = roomCode;
      await currentRoom.save();
      res.render("host", { roomCode: roomCode });
    } else {
      console.log("No room or already has admin");
      res.redirect('/');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/:roomCode", (req,res) =>{
  const roomCode = req.params.roomCode;
  res.render("player", {roomCode: roomCode})
})

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  //identify host Socket
  socket.on('identify', (role, roomCode)=>{
    socket.role = role;
    socket.roomCode = roomCode;
    if (role === 'host'){
      console.log(roomCode + " " + role + " connected")
    }
    else if(role === 'player'){
      console.log(roomCode + " " + role + " connected")
    }
  })
  //Delete game if admin disconnects
  socket.on('disconnect', async () => {
    const { roomCode, role } = socket;
    if (role === 'host') {
      try {
        const result = await Room.deleteOne({ room: roomCode });

        if (result.deletedCount === 0) {
          console.log('Room not found or already deleted');
        } else {
          console.log(`Room with code ${roomCode} deleted.`);

          io.emit('user-disconnected', roomCode, role);
        }
      } catch (error) {
        console.error('Error deleting room:', error);
      }
    }
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

async function generateRoomCode (){
  let code;
  let isCodeUnique = false;
  while (!isCodeUnique){
    code = Math.floor(1000000000 + Math.random() * 9000000000);

    const existingRoom = await Room.findOne({ room: code });
    
    if (!existingRoom) {
    isCodeUnique = true;
    }
  }
  return code;
}

async function createNewRoom() {
  const roomCode = await generateRoomCode();
  const newRoom = new Room ({
    players: [],
    questions: [],
    room: roomCode.toString(),
    question: 0,
    admin: ''
  });
  try{
    await newRoom.save();
    console.log("New room created ", newRoom);
  }catch(error){
    console.error('Error Creating room', error)
  }
  return roomCode;
}
