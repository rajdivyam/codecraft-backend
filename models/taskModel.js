const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // The frontend 'task-12345' id
  content: { type: String, required: true },
  column: { type: String, enum: ['todo', 'inProgress', 'completed'], required: true },
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
