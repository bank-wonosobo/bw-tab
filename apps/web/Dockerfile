
# syntax=docker/dockerfile:1.7

# ==========================================
# STAGE 1: PHP + Composer + Wayfinder
# ==========================================
FROM php:8.4-cli-bookworm AS php-build

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    libzip-dev \
    libicu-dev \
    libonig-dev \
    && docker-php-ext-install \
        pdo_pgsql \
        zip \
        intl \
        mbstring \
        bcmath \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy source code
COPY . .

# Remove cached Laravel manifests
RUN rm -f \
    bootstrap/cache/packages.php \
    bootstrap/cache/services.php \
    bootstrap/cache/config.php

# Install production dependencies
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

# Rebuild package discovery
RUN php artisan package:discover --ansi

# Generate Wayfinder
RUN php artisan wayfinder:generate --with-form


# ==========================================
# STAGE 2: React + Vite Plus + pnpm
# ==========================================
FROM node:22-alpine AS frontend

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Install Node dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

# Copy frontend source
COPY . .

# Copy generated Wayfinder files
COPY --from=php-build /app/resources/js/actions \
    ./resources/js/actions

COPY --from=php-build /app/resources/js/routes \
    ./resources/js/routes

COPY --from=php-build /app/resources/js/wayfinder \
    ./resources/js/wayfinder

# Disable Wayfinder generation inside Vite
ENV SKIP_WAYFINDER=true

# Build frontend assets
RUN pnpm run build


# ==========================================
# STAGE 3: Laravel PHP-FPM Production
# ==========================================
FROM php:8.4-fpm-bookworm AS production

RUN apt-get update && apt-get install -y \
    libpq-dev \
    libzip-dev \
    libicu-dev \
    libonig-dev \
    && docker-php-ext-install \
        pdo_pgsql \
        zip \
        intl \
        mbstring \
        bcmath \
        opcache \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /var/www/html

# Copy application
COPY . .

# Remove Vite development server indicator
RUN rm -f public/hot

# Copy Composer dependencies
COPY --from=php-build /app/vendor ./vendor

# Copy built React assets
COPY --from=frontend /app/public/build ./public/build

# Prepare Laravel writable directories
RUN mkdir -p \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && chown -R www-data:www-data \
        storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

# PHP-FPM port
EXPOSE 9000

CMD ["php-fpm"]
