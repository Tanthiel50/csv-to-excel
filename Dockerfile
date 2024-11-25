# Étape 1 : Construction
FROM node:18 AS build

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers nécessaires
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm install

# Copier tout le reste
COPY . .

# Construire l'application React
RUN npm run build

# Étape 2 : Exécution
FROM nginx:alpine

# Copier les fichiers de build dans le dossier nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Exposer le port 80
EXPOSE 80

# Lancer Nginx
CMD ["nginx", "-g", "daemon off;"]
