"""Vercel Python serverless entry point.

Vercel detects the ASGI `app` object exported here and serves the whole
FastAPI application. All routes are rewritten to this handler via vercel.json.
"""
import os
import sys

# Make the `app` package importable when Vercel runs this file from api/.
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.main import app  # noqa: E402  (path set above)

# `app` is the ASGI application Vercel will serve.
