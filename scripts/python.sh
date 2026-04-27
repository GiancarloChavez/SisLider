#!/usr/bin/env bash
# Wrapper para Python 3.12 — evita el stub de la Microsoft Store
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 \
  "/c/Users/MSI/AppData/Local/Programs/Python/Python312/python.exe" "$@"
