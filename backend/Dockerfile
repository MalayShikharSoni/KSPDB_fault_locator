FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
COPY start.sh /start.sh
RUN sed -i 's/\r$//' /start.sh && chmod +x /start.sh
EXPOSE 3000
CMD ["/start.sh"]
