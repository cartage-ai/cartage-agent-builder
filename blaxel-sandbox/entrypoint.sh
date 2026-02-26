#!/bin/sh
# Start the Blaxel sandbox API (required); keep container running.
# The app (cartage-agent) is cloned and started by the workflow via the process API.

/usr/local/bin/sandbox-api &

echo "Waiting for sandbox API..."
while ! nc -z 127.0.0.1 8080 2>/dev/null; do
  sleep 0.1
done

echo "Sandbox API ready"
wait
