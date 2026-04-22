const mongoose = require("mongoose")

const playerSchema = new mongoose.Schema({
  intelligence: Number,
  morality: Number,
  charisma: Number,
  luck: Number,
  humor : Number,
  creativity : Number,
  achievement: Number,
  attraction: Number,
  strength: Number,
  effort: Number,
  points: Number,
  socket: String,
  room: String,
  answer: Array,
  modesty: Number,
  playerNumber: Number,
  name: String,
}, { collection: 'players' })

module.exports = mongoose.model("players", playerSchema)

