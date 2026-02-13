@echo off
echo Starting Next.js server... > server.log
npm run dev >> server.log 2>&1
