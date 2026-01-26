# Deployment and Rollback (Railway)

This document explains the recommended branch flow, CI, and rollback steps when using Railway.

Secrets required (set in GitHub repository Settings → Secrets):

- RAILWAY_TOKEN — Railway API token with deploy permissions.
- RAILWAY_PROJECT — (optional) Railway project id or name to link in CI.

Branches and flow:

- preprod — used for QA; preprod is connected to the Preprod Railway environment and runs CI (.github/workflows/preprod-ci.yml).
- production — protected branch; pushes to this branch trigger .github/workflows/deploy-railway.yml to deploy to Railway Production.

Rollback strategy:

- Preferred: revert the bad commit(s) and push the revert so CI/deploy runs with the reverted code.

  Example:

  git checkout production
  git pull origin production
  git log --oneline   # find bad commit SHA
  git revert BAD_SHA
  git push origin production

- To revert multiple commits (no commit until finished):

  git revert --no-commit BAD_SHA..HEAD
  git commit -m "Revert bad deploys"
  git push origin production

- Avoid force-pushing unless necessary. If you must reset to a known-good commit and force, use:

  git checkout production
  git reset --hard GOOD_SHA
  git push --force-with-lease origin production

Railway dashboard rollback:

- Railway often exposes previous deployments in the project dashboard; use the UI to redeploy a previous successful deployment where available — this is usually the fastest rollback.

GitHub Actions and secrets:

- The deploy-railway.yml workflow will install the Railway CLI and attempt to run it using RAILWAY_TOKEN. Configure RAILWAY_TOKEN and optionally RAILWAY_PROJECT in repository secrets.
- If your Railway setup uses a different CLI flow, edit .github/workflows/deploy-railway.yml to match your commands.

Creating branches locally:

  git checkout -b preprod
  git push -u origin preprod

  git checkout -b production
  git push -u origin production

Protection recommendations:

- Protect production (and preprod if desired) in GitHub branch settings: require PR reviews, require status checks (CI) to pass before merge.

If you want, I can also:

- Add a GitHub Action job to automatically promote preprod deployments to production with manual approval.
- Add a small railway-based deploy Action step tailored to your Railway project once you provide the project id and preferred CLI commands.
