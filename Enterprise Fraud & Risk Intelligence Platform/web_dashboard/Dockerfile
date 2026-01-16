FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static assets (The Dashboard folder contains the moved files)
COPY Dashboard /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
