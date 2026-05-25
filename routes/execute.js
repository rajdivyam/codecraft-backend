const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec, execFile, spawn } = require('child_process');

// Helper to clean up temp files
const cleanup = (dirPath) => {
    try {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
        }
    } catch (err) {
        console.error("Cleanup error:", err);
    }
};

// Helper to run a command with optional stdin input
const runWithInput = (command, input, options) => {
    return new Promise((resolve, reject) => {
        const child = exec(command, { ...options, shell: true }, (error, stdout, stderr) => {
            if (error) {
                resolve({ error, stdout, stderr });
            } else {
                resolve({ error: null, stdout, stderr });
            }
        });

        // If there is stdin input, write it and close stdin
        if (input !== undefined && input !== null && input !== '') {
            child.stdin.write(input);
            child.stdin.end();
        } else {
            child.stdin.end();
        }
    });
};

// Helper to compile code (for C, C++, Java)
const compileCode = (compileCommand, options) => {
    return new Promise((resolve, reject) => {
        exec(compileCommand, { ...options, shell: true }, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, error: stderr || error.message });
            } else {
                resolve({ success: true, warning: stderr || '' });
            }
        });
    });
};

router.post("/", async (req, res) => {
    const { language, code, input } = req.body;

    if (!language || !code) {
        return res.status(400).json({ error: "Language and code are required." });
    }

    // Unique ID for this execution instance
    const id = Date.now().toString() + Math.floor(Math.random() * 10000).toString();
    const tempDir = path.join(__dirname, '..', 'temp_exec', id);

    try {
        // Create an isolated temp directory for this execution
        if (!fs.existsSync(path.join(__dirname, '..', 'temp_exec'))) {
            fs.mkdirSync(path.join(__dirname, '..', 'temp_exec'));
        }
        fs.mkdirSync(tempDir);

        const execOptions = { timeout: 10000, maxBuffer: 1024 * 1024 };

        if (language === 'c') {
            const filePath = path.join(tempDir, 'main.c');
            const outPath = path.join(tempDir, 'program.exe');
            fs.writeFileSync(filePath, code);

            // Step 1: Compile
            const compileResult = await compileCode(`gcc "${filePath}" -o "${outPath}"`, execOptions);
            if (!compileResult.success) {
                cleanup(tempDir);
                return res.status(200).json({ output: '', error: compileResult.error });
            }

            // Step 2: Run with input
            const runResult = await runWithInput(`"${outPath}"`, input, execOptions);
            cleanup(tempDir);
            if (runResult.error) {
                return res.status(200).json({
                    output: runResult.stdout,
                    error: runResult.stderr || runResult.error.message || "Execution failed or timed out."
                });
            }
            return res.status(200).json({ output: runResult.stdout, error: runResult.stderr });
        }
        else if (language === 'cpp') {
            const filePath = path.join(tempDir, 'main.cpp');
            const outPath = path.join(tempDir, 'program.exe');
            fs.writeFileSync(filePath, code);

            // Step 1: Compile
            const compileResult = await compileCode(`g++ "${filePath}" -o "${outPath}"`, execOptions);
            if (!compileResult.success) {
                cleanup(tempDir);
                return res.status(200).json({ output: '', error: compileResult.error });
            }

            // Step 2: Run with input
            const runResult = await runWithInput(`"${outPath}"`, input, execOptions);
            cleanup(tempDir);
            if (runResult.error) {
                return res.status(200).json({
                    output: runResult.stdout,
                    error: runResult.stderr || runResult.error.message || "Execution failed or timed out."
                });
            }
            return res.status(200).json({ output: runResult.stdout, error: runResult.stderr });
        }
        else if (language === 'java') {
            let className = 'Main';
            const match = code.match(/public\s+class\s+([a-zA-Z0-9_]+)/);
            if (match && match[1]) {
                className = match[1];
            }

            const filePath = path.join(tempDir, `${className}.java`);
            fs.writeFileSync(filePath, code);

            // Step 1: Compile
            const compileResult = await compileCode(`cd "${tempDir}" && javac "${className}.java"`, execOptions);
            if (!compileResult.success) {
                cleanup(tempDir);
                return res.status(200).json({ output: '', error: compileResult.error });
            }

            // Step 2: Run with input
            const runResult = await runWithInput(`cd "${tempDir}" && java "${className}"`, input, execOptions);
            cleanup(tempDir);
            if (runResult.error) {
                return res.status(200).json({
                    output: runResult.stdout,
                    error: runResult.stderr || runResult.error.message || "Execution failed or timed out."
                });
            }
            return res.status(200).json({ output: runResult.stdout, error: runResult.stderr });
        }
        else if (language === 'javascript' || language === 'js') {
            const filePath = path.join(tempDir, 'main.js');
            fs.writeFileSync(filePath, code);

            const runResult = await runWithInput(`node "${filePath}"`, input, execOptions);
            cleanup(tempDir);
            if (runResult.error) {
                return res.status(200).json({
                    output: runResult.stdout,
                    error: runResult.stderr || runResult.error.message || "Execution failed or timed out."
                });
            }
            return res.status(200).json({ output: runResult.stdout, error: runResult.stderr });
        }
        else if (language === 'python' || language === 'py') {
            const filePath = path.join(tempDir, 'main.py');
            fs.writeFileSync(filePath, code);

            const runResult = await runWithInput(`python "${filePath}"`, input, execOptions);
            cleanup(tempDir);
            if (runResult.error) {
                return res.status(200).json({
                    output: runResult.stdout,
                    error: runResult.stderr || runResult.error.message || "Execution failed or timed out."
                });
            }
            return res.status(200).json({ output: runResult.stdout, error: runResult.stderr });
        }
        else {
            cleanup(tempDir);
            return res.status(400).json({ error: "Unsupported language." });
        }

    } catch (err) {
        cleanup(tempDir);
        res.status(500).json({ error: "Internal Server Error: " + err.message });
    }
});

module.exports = router;
