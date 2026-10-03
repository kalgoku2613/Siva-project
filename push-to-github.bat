@echo off
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
echo ========================================================
echo   Pushing ESP Smart Control to GitHub
echo   Repository: https://github.com/kalgoku2613/Siva-project.git
echo ========================================================
git push -u origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo If GitHub requires authentication:
    echo 1. Generate a token at: https://github.com/settings/tokens (Select 'repo' scope)
    echo 2. Enter your GitHub username and paste the token as your password.
    echo.
    echo Alternatively run in terminal:
    echo git push https://YOUR_GITHUB_TOKEN@github.com/kalgoku2613/Siva-project.git main
)
pause
