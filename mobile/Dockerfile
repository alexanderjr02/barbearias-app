# Flutter Web build for CORTIX — served as a static site (nginx) next to the
# Next.js API in docker-compose. Not used for Android/iOS builds — those still
# go through `flutter build apk`/`flutter build ios` on a real toolchain.
FROM ghcr.io/cirruslabs/flutter:stable AS build
WORKDIR /app

COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

COPY . .

# API_BASE_URL is baked into the compiled JS at build time (Flutter Web has
# no runtime env vars) — it must be an address the *browser* can reach, not
# a Docker-internal service name. Defaults to the Next.js service published
# on the host by docker-compose.
ARG API_BASE_URL=http://localhost:3000/api/v1
RUN flutter build web --release --dart-define=API_BASE_URL=${API_BASE_URL}

FROM nginx:1.27-alpine AS runner
COPY --from=build /app/build/web /usr/share/nginx/html
EXPOSE 80
