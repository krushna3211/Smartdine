# 1. Use a lightweight Node.js version (The "Base Box")
FROM node:lts-alpine

# 2. Create a working folder inside the box
WORKDIR /app

# 3. Copy your settings files first (for speed)
COPY package*.json ./

# 4. Install the dependencies inside the box
RUN npm install --production

# 5. Copy ALL your project files (Backend + Public frontend) into the box
COPY . .

# 6. Open the door (Port 5000)
EXPOSE 5000

# 7. The command to start the app when the box opens
CMD ["npm", "start"]