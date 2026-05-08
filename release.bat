@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

for /f "delims=" %%i in ('git rev-parse --show-toplevel 2^>NUL') do set REPO_ROOT=%%i
if not defined REPO_ROOT (
  echo Not a git repo. Run this from inside the repo.
  exit /b 1
)

cd /d "%REPO_ROOT%"

git diff --quiet
if errorlevel 1 (
  echo Working tree has unstaged changes. Commit/stash them first.
  exit /b 1
)

git diff --cached --quiet
if errorlevel 1 (
  echo Index has staged changes. Commit/stash them first.
  exit /b 1
)

where npm >NUL 2>&1
if errorlevel 1 (
  echo npm not found in PATH. Install Node.js/npm first.
  exit /b 1
)

echo Bumping frontend patch version...
for /f "delims=" %%v in ('npm --prefix frontend version patch --no-git-tag-version') do set NEWVER_RAW=%%v
if not defined NEWVER_RAW (
  echo Failed to bump frontend version.
  exit /b 1
)

set NEWVER=%NEWVER_RAW%
if /i "!NEWVER:~0,1!"=="v" set NEWVER=!NEWVER:~1!

echo Syncing backend version to %NEWVER% ...
call npm --prefix backend version %NEWVER% --no-git-tag-version
if errorlevel 1 (
  echo Failed to set backend version.
  exit /b 1
)

echo Committing version bumps...
git add frontend/package.json frontend/package-lock.json backend/package.json
git commit -m "chore: bump version to %NEWVER%"
if errorlevel 1 (
  echo Commit failed.
  exit /b 1
)

echo Tagging v%NEWVER% ...
git tag "v%NEWVER%"
if errorlevel 1 (
  echo Tag creation failed (tag may already exist).
  exit /b 1
)

echo Pushing commit...
git push origin HEAD
if errorlevel 1 (
  echo Commit push failed.
  exit /b 1
)

echo Pushing tag v%NEWVER% ...
git push origin "v%NEWVER%"
if errorlevel 1 (
  echo Tag push failed.
  exit /b 1
)

echo Done: released v%NEWVER%
