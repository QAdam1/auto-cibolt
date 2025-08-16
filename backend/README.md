# Workflow Trigger Backend

This backend service allows you to trigger GitHub workflows securely via a webhook endpoint.

## 🚀 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file:
```env
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO=QAdam1/auto-cibolt
PORT=3000
```

### 3. GitHub Token Setup
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` scope
3. Copy the token to your `.env` file

### 4. Run the Service
```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 How It Works

1. **Frontend** (HTML page) calls `/trigger-workflow` endpoint
2. **Backend** uses your GitHub token to call GitHub API
3. **GitHub** triggers the workflow via `repository_dispatch` event
4. **Workflow** executes with your "env" environment protection

## 🌐 API Endpoints

### POST `/trigger-workflow`
Triggers the CI/CD pipeline workflow.

**Response:**
```json
{
  "success": true,
  "message": "Workflow triggered successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "repo": "QAdam1/auto-cibolt"
}
```

## 🔒 Security

- **GitHub token** is stored as environment variable
- **No tokens exposed** in frontend code
- **Backend validates** all requests
- **Uses your GitHub permissions** and environment protection

## 🚀 Deployment Options

### Option 1: Local Development
```bash
npm run dev
```

### Option 2: Heroku
```bash
heroku create your-app-name
heroku config:set GITHUB_TOKEN=your_token
heroku config:set GITHUB_REPO=QAdam1/auto-cibolt
git push heroku main
```

### Option 3: Vercel
```bash
vercel --env GITHUB_TOKEN=your_token
vercel --env GITHUB_REPO=QAdam1/auto-cibolt
```

### Option 4: Railway
```bash
railway login
railway init
railway variables set GITHUB_TOKEN=your_token
railway variables set GITHUB_REPO=QAdam1/auto-cibolt
railway up
```

## 📁 File Structure

```
backend/
├── trigger-workflow.js    # Main server file
├── package.json           # Dependencies
├── README.md             # This file
└── .env                  # Environment variables (create this)
```

## 🔍 Troubleshooting

### Common Issues:

1. **"GITHUB_TOKEN environment variable is required"**
   - Make sure you have a `.env` file with `GITHUB_TOKEN=your_token`

2. **"GitHub API error: 401"**
   - Check your GitHub token is valid and has `repo` scope

3. **"GitHub API error: 404"**
   - Verify `GITHUB_REPO` is correct (format: `username/repository`)

4. **Workflow not triggering**
   - Check your workflow has `repository_dispatch` trigger
   - Verify your "env" environment protection rules

## 🎯 Next Steps

1. **Deploy the backend** to your preferred platform
2. **Update the HTML** to point to your backend URL
3. **Test the workflow trigger** by clicking the button
4. **Monitor execution** in GitHub Actions tab 