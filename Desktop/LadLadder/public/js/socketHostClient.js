console.log("host Connected")

const socket = io()

const role = 'host';
const roomCode = window.location.pathname.split('/')[2];

socket.emit('identify', role, roomCode);
