const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // The frontend ID
  title: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
