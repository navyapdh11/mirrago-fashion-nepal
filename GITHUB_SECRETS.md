# 🔐 GitHub Secrets Setup

The CI/CD pipeline requires the following secrets to be configured in your GitHub repository.

## Required Secrets

Go to: **https://github.com/navyapdh11/mirrago-fashion-nepal/settings/secrets/actions**

| Secret Name | Value | How to Get It |
|-------------|-------|---------------|
| `VERCEL_TOKEN` | Vercel API token | Run `vercel token create` or get from https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | `team_9ekqnvZowAAl5JAUNxbkceGs` | From `frontend/.vercel/project.json` (`orgId`) |
| `VERCEL_PROJECT_ID` | `prj_FSwH32W3ZVQGQfIaYM6XPut5uemy` | From `frontend/.vercel/project.json` (`projectId`) |
| `VERCEL_DEPLOY_HOOK_URL` | Deploy hook URL | See instructions below |

## Creating a Vercel Deploy Hook

1. Go to https://vercel.com/perth-tea/frontend/settings/git
2. Scroll to **Deploy Hooks**
3. Click **Create Hook**
4. Name: `github-cicd`, Branch: `main`
5. Copy the URL and paste it as `VERCEL_DEPLOY_HOOK_URL` in GitHub secrets

## Creating a Vercel Token

1. Go to https://vercel.com/account/tokens
2. Click **Create**
3. Copy the token and paste it as `VERCEL_TOKEN` in GitHub secrets

## Alternative: GitHub + Vercel Integration (Recommended)

Instead of using secrets, you can connect Vercel directly to your GitHub repo:

1. Go to https://vercel.com/perth-tea/frontend/settings/git
2. Click **Connect Git Repository**
3. Select `navyapdh11/mirrago-fashion-nepal`
4. Vercel will auto-deploy on every push to `main`

This is simpler and doesn't require any GitHub secrets. The CI/CD workflow will still run linting, building, and CodeQL scans on every push/PR.
