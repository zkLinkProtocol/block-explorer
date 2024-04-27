#!/bin/bash

set -e

# Prepare the database if it's not ready. No-op if the DB is prepared.
npm run migration:run
# Run the worker service
npm run start
