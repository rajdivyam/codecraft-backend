const express = require('express');
const { getTasks, addTask, deleteTask, updateTaskStatus } = require('../controller/taskController');

const router = express.Router();

// Get all tasks
router.get("/", getTasks);

// Add a new task
router.post("/", addTask);

// Delete a task
router.delete("/:taskId", deleteTask);

// Update task status (e.g., move from todo to in-progress)
router.put("/status", updateTaskStatus);

module.exports = router;
