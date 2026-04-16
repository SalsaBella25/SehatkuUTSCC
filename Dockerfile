# Gunakan image Node.js versi terbaru
FROM node:18

# Set folder kerja di dalam container
WORKDIR /app

# Copy file package.json dan install library
COPY package*.json ./
RUN npm install

# Copy seluruh source code aplikasi
COPY . .

# Aplikasi berjalan di port 80 sesuai instruksi EC2
EXPOSE 80

# Jalankan aplikasi
CMD ["node", "app.js"]