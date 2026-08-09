FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY favicon.svg /usr/share/nginx/html/favicon.svg
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY img /usr/share/nginx/html/img

EXPOSE 80
