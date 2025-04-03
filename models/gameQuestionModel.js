const mongoose = require("mongoose")

const gameQuestionSchema = new mongoose.Schema({
  attributes: Array,
  positive: Boolean,
  question: String,
}, { collection: 'gamequestions' })

module.exports = mongoose.model("gameQuestions", gameQuestionSchema)