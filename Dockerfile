# 1. Imagem base
FROM node:20-alpine

# 2. Diretório de trabalho
WORKDIR /app

# 3. Copia package.json e package-lock
COPY package*.json ./

# 4. Instala dependências
RUN npm install

# 5. Copia o resto do projeto
COPY . .

# 6. Expõe porta do Vite
EXPOSE 8080

# 7. Comando para rodar o dev server
CMD ["npm", "run", "dev"]