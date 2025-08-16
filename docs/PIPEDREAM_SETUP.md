# 🚀 Pipedream Setup Guide

This guide will walk you through setting up Pipedream to trigger your GitHub workflow for **FREE**.

## 📋 **Prerequisites**
- GitHub account with access to `QAdam1/auto-cibolt`
- GitHub Personal Access Token with `repo` scope

## 🔑 **Step 1: Create GitHub Token**
1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name like "Auto-Cibolt Workflow Trigger"
4. Select scope: `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token** - you'll need it for Pipedream

## 🌐 **Step 2: Create Pipedream Account**
1. Go to [Pipedream.com](https://pipedream.com)
2. Click "Sign Up" and create a free account
3. Verify your email

## ⚙️ **Step 3: Create Pipedream Workflow**

### **3.1 Create New Workflow**
1. Click "New Workflow" button
2. Click "Start from scratch"

### **3.2 Add Webhook Trigger**
1. Click "Add a trigger"
2. Search for "Webhook"
3. Click "Webhook" trigger
4. Click "Save and continue"
5. **Copy the webhook URL** - you'll need this for your HTML

### **3.3 Add GitHub API Action**
1. Click "Add a step"
2. Search for "Webhook"
3. Click "Webhook" action
4. Configure the action:

**URL:**
```
https://api.github.com/repos/QAdam1/auto-cibolt/dispatches
```

**Method:** `POST`

**Headers:**
```
Accept: application/vnd.github+json
Authorization: token YOUR_GITHUB_TOKEN_HERE
Content-Type: application/json
```

**Body:**
```json
{
  "event_type": "webhook"
}
```

### **3.4 Save and Deploy**
1. Click "Save" button
2. Click "Deploy" button
3. **Enable the workflow** (toggle switch)

## 🔧 **Step 4: Update Your HTML**

Replace `YOUR_PIPEDREAM_WEBHOOK_URL_HERE` in your HTML with the actual webhook URL from step 3.2.

## 🧪 **Step 5: Test It**

1. **Push your changes** to GitHub
2. **Wait for GitHub Pages** to deploy (usually 1-2 minutes)
3. **Visit your GitHub Pages site**
4. **Click "Run Pipeline" button**
5. **Check GitHub Actions tab** - workflow should be running!

## 🔍 **Troubleshooting**

### **Workflow Not Triggering?**
- Check Pipedream workflow is **enabled**
- Verify webhook URL is correct in HTML
- Check GitHub token has `repo` scope
- Look at Pipedream workflow logs

### **GitHub API Errors?**
- Verify token is correct
- Check token hasn't expired
- Ensure token has `repo` scope

### **Pipedream Errors?**
- Check workflow is deployed and enabled
- Verify webhook trigger is working
- Check step configuration

## 💰 **Cost Breakdown**
- **GitHub Pages**: Free
- **Pipedream**: Free tier (1,000 events/month)
- **Your app**: Very lightweight, well within limits
- **Total cost**: $0

## 🎯 **What Happens When You Click the Button**

1. **Button click** → Calls Pipedream webhook
2. **Pipedream** → Receives webhook and calls GitHub API
3. **GitHub** → Triggers workflow via `repository_dispatch`
4. **Workflow** → Runs with your "env" environment protection
5. **Success!** → Pipeline executes automatically

## 🚀 **Next Steps**

1. **Follow the setup guide above**
2. **Test the button** on your GitHub Pages site
3. **Monitor workflow execution** in GitHub Actions
4. **Enjoy your free, automated workflow trigger!**

---

**Need help?** Check the Pipedream workflow logs or GitHub Actions for error messages. 