const socket = io("http://localhost:5000")

socket.on("connect", () => {
  console.log("Connected to Socket.io server with ID:", socket.id);
});