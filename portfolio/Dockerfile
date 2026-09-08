FROM nginx:alpine
RUN apk update && apk upgrade --no-cache
COPY index.html style.css script.js /usr/share/nginx/html/
EXPOSE 80
