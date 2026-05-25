const Task = require('../models/taskModel');

// Get all tasks, grouped by status
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find();
    const groupedTasks = {
      todo: tasks.filter(task => task.status === 'todo'),
      inProgress: tasks.filter(task => task.status === 'inProgress'),
      completed: tasks.filter(task => task.status === 'completed'),
    };
    res.json(groupedTasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add a new task
const addTask = async (req, res) => {
  const { content, status } = req.body;
  const newTask = new Task({ content, status });

  try {
    await newTask.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a task by ID
const deleteTask = async (req, res) => {
  const { taskId } = req.params;

  try {
    const deletedTask = await Task.findByIdAndDelete(taskId);
    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update the status of a task
const updateTaskStatus = async (req, res) => {
  const { taskId, status } = req.body;

  try {
    const updatedTask = await Task.findByIdAndUpdate(taskId, { status }, { new: true });
    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(200).json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTasks, addTask, deleteTask, updateTaskStatus };
