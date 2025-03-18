const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const mongoose = require('mongoose')

const Room = require('./models/roomModel');
const Players = require('./models/playerModel');

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

app.get("/join/:roomCode", async (req,res) =>{
  const roomCode = req.params.roomCode;
  try {
    const currentRoom = await Room.findOne({ room: roomCode });
    
    if (currentRoom && currentRoom.admin && currentRoom.players.length < 8) {
      currentRoom.admin = roomCode;
      await currentRoom.save();
      res.render("player", { roomCode: roomCode });
    } else {
      console.log("No room");
      res.redirect('/');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
})

app.get("/join", (req,res)=>{
  res.render("join")
})

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle identify event (for both host and player)
  socket.on('identify', async (role, roomCode, name) => {
    socket.role = role;
    socket.roomCode = roomCode;
    socket.name = name;

    if (role === 'host') {
      // Host joining the room
      socket.join(roomCode);
      console.log(`${roomCode} ${role} connected`);
    } else if (role === 'player') {
      // Player joining the room
      socket.join(roomCode);
      try {
        const currentRoom = await Room.findOne({ room: roomCode });

        if (currentRoom && currentRoom.players.length < 8) {
          const newPlayer = await createNewPlayer(socket.id, roomCode, name, currentRoom.players.length + 1);
          await newPlayer.save();
          currentRoom.players.push(newPlayer._id);
          await currentRoom.save();

          socket.to(roomCode).emit("player-join", { name: newPlayer.name, playerNumber: newPlayer.playerNumber });

          if (currentRoom.players.length >= 3) {
            console.log("Enough players");
            socket.to(roomCode).emit("min-players");
          }
        } else {
          console.log(`Room ${roomCode} is full or doesn't exist`);
        }
      } catch (error) {
        console.error('Error adding player to room:', error);
      }
    }
  });

  // Handle game join event (simply log for now)
  socket.on("start-game", async () => {
    try {
      const currentRoom = await Room.findOne({ room: socket.roomCode });
      currentRoom.gameStarted = true;
      currentRoom.save();
      socket.to(socket.roomCode).emit("start-game")   //start-game to players
      socket.emit("start-game")                       //start-game to host
    } catch (error){
      console.log(error)
    }
  });

  // Handle disconnect event (delete game if host disconnects)
  socket.on('disconnect', async () => {
    const { roomCode, role } = socket;
    
    if (role === 'host') {
      // Host disconnects, delete the room
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
    } else if (role === 'player') {
      // Player disconnects, remove them from the room
      try {
        const player = await Players.findOne({ socket: socket.id });

        if (player) {
          const currentRoom = await Room.findOne({ room: roomCode });

          if (currentRoom) {
            currentRoom.players = currentRoom.players.filter(
              (playerId) => playerId.toString() !== player._id.toString()
            );
            await currentRoom.save();
            console.log(`Player ${player._id} removed from room ${roomCode}`);

            // Optionally, delete the player document from the Players collection
            await Players.deleteOne({ _id: player._id });
            console.log(`Player ${player._id} deleted from database`);

            // Notify other clients that a player has disconnected
            io.to(roomCode).emit('player-disconnected', { playerId: player._id, roomCode });
          } else {
            console.log(`Room ${roomCode} not found`);
          }
        } else {
          console.log(`Player with socket ID ${socket.id} not found`);
        }
      } catch (error) {
        console.error('Error handling player disconnection:', error);
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
    admin: '',
    gameStarted: false,
  });
  try{
    await newRoom.save();
    console.log("New room created ", newRoom);
  }catch(error){
    console.error('Error Creating room', error)
  }
  return roomCode;
}

async function createNewPlayer(socketid, room, name, playerNumber){
    const newPlayer = new Players({
      arts: 0,
      athleticism: 0,
      attractiveness: 0,
      charm: 0,
      creativity: 0,
      empathy: 0,
      humor: 0,
      intelligence: 0,
      morality: 0,
      points: 0,
      socialSkills: 0,
      socket: socketid,
      room: room,
      answer: [],
      modesty: 0,
      playerNumber: playerNumber,
      name: name,
  });
  try{
    await newPlayer.save();
    console.log("Player joined ", room);
  }catch(error){
    console.error('Error adding Player', error)
  }
  return newPlayer;
}
