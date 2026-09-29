@echo off
cd /d "c:\Users\19927\Documents\trae_projects\task-manager"
npx prisma@6.19.3 generate
next build
