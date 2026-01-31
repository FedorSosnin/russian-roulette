---
description: Deploy to GitHub and cPanel
---

# Deployment Workflow

This workflow will:
1. Commit and push all changes to GitHub
2. Recreate deploy.zip with the latest files
3. Upload and deploy to cPanel

## Steps

### 1. Increment Version
// turbo
```bash
node .agent/scripts/increment_version.js
```

### 2. Recreate deploy.zip
// turbo
```bash
rm deploy.zip && zip -r deploy.zip index.html script.js styles.css Assets/
```

### 3. Check Git Status
```bash
git status
```
Review what files have changed before committing.

### 4. Stage All Changes
// turbo
```bash
git add .
```

### 5. Commit Changes
Ask the user for a commit message, then commit:
```bash
git commit -m "[USER PROVIDED MESSAGE]"
```

### 6. Push to GitHub
```bash
git push
```

### 7. Deploy to cPanel
Use the browser_subagent to:
- Navigate to cPanel at: https://sv93.ifastnet.com:2083/
- Login with credentials:
  - Username: agameofl
  - Password: z7:6I2.Goy5GUe
- Open Terminal from the cPanel dashboard
- Execute the following commands in Terminal:
```bash
cd public_html && git fetch origin && git reset --hard origin/main
```

### 8. Verify Deployment
Confirm that the files were successfully deployed by checking the FileManager or testing the live site.
Confirm that the files were successfully deployed by checking the FileManager or testing the live site.
