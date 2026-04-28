FROM node:18-slim AS ui-build
WORKDIR /ui
COPY ui/package.json ui/package-lock.json ./
RUN npm ci
COPY ui/ .
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

COPY services/procurement-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/procurement-api/ ./api/
COPY data/ ./data/
COPY --from=ui-build /ui/dist ./static/

ENV DATA_DIR=/app/data
ENV PYTHONUNBUFFERED=1

WORKDIR /app/api

EXPOSE 8090

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090"]
