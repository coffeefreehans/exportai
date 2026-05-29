#!/bin/sh
echo "Waiting for PostgreSQL..."
while ! nc -z "$PGHOST" "$PGPORT"; do
  sleep 0.5
done
echo "PostgreSQL is up!"
