# syntax=docker/dockerfile:1.7

# ==========================================
# STAGE 1: FrankenPHP Base
# ==========================================
FROM dunglas/frankenphp:1-php8.4-bookworm AS base

WORKDIR /app

RUN install-php-extensions \
    pdo_pgsql \
    zip \
    intl \
    mbstring \
    bcmath \
    opcache \
    pcntl

# ==========================================
# STAGE 2: Composer + Wayfinder
# ==========================================
FROM base AS php-build

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY . .

# Remove cached Laravel manifests
RUN rm -f bootstrap/cache/*.php

# Install production dependencies
RUN --mount=type=cache,target=/tmp/composer-cache \
    COMPOSER_CACHE_DIR=/tmp/composer-cache \
    composer install \
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
# STAGE 3: React + Vite Plus + pnpm
# ==========================================
FROM node:22-bookworm-slim AS frontend

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
# STAGE 4: FrankenPHP Production
# ==========================================
FROM base AS production

WORKDIR /app

ENV APP_ENV=production
ENV APP_DEBUG=false
ENV SERVER_NAME=:80

# PHP production configuration
RUN cp "$PHP_INI_DIR/php.ini-production" \
    "$PHP_INI_DIR/php.ini"

# Copy application and Composer dependencies
COPY --from=php-build /app /app

# Copy built frontend assets
COPY --from=frontend /app/public/build \
    /app/public/build

# Copy Caddy configuration
COPY docker/frankenphp/Caddyfile /etc/caddy/Caddyfile

COPY docker/frankenphp/php.ini \
    $PHP_INI_DIR/conf.d/99-custom.ini

# Remove Vite development server indicator
RUN rm -f public/hot

# Prepare Laravel writable directories
RUN mkdir -p \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && chown -R www-data:www-data \
        storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

EXPOSE 80

CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
