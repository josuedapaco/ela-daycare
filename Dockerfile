FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY favicon.svg /usr/share/nginx/html/favicon.svg
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY img /usr/share/nginx/html/img

RUN sed -i 's/listen[[:space:]]*80;/listen 82;/' /etc/nginx/conf.d/default.conf

EXPOSE 82
