const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'QAdam1/auto-cibolt';

// Validate GitHub token is set
if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN environment variable is required');
    process.exit(1);
}

// Route to trigger workflow
app.post('/trigger-workflow', async (req, res) => {
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_type: 'workflow_dispatch'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }

        res.json({ 
            success: true, 
            message: 'Workflow triggered successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error triggering workflow:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        repo: GITHUB_REPO
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Workflow trigger service running on port ${port}`);
    console.log(`📁 Repository: ${GITHUB_REPO}`);
    console.log(`🔑 GitHub token: ${GITHUB_TOKEN ? '✅ Set' : '❌ Missing'}`);
});

module.exports = app; 