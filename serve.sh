#!/bin/bash

HOST="0.0.0.0"
PORT="8080"

waitress-serve --host="$HOST" --port="$PORT" --call main:create_app

