# DropDetect Web Dashboard

This is the central web dashboard for the **DropDetect** project, a Next.js web application designed to receive, store, and display thermal fogger droplet analysis data.

## Overview
The DropDetect ecosystem consists of two main parts:
1. **Desktop AI Application (C# Avalonia)**: Uses USB Microscopes and YOLOv11 to analyze droplet sizes on glass slides and calculate VMD/SPAN in real-time.
2. **Web Dashboard (This Repository)**: A centralized Next.js application that receives the analysis results from the Desktop App via API, stores them in a **Supabase (PostgreSQL)** database, and provides an admin dashboard for reporting and PDF generation.

## Features
- Secure API endpoint to receive data from the Desktop Application.
- Admin dashboard for monitoring all misting machine assessments.
- Detailed statistics (VMD, SPAN, Droplet Count, Pass/Fail status).
- Location and machinery registry.

## Getting Started

Please refer to `SETUP.md` for instructions on how to set up the environment variables and run this project locally.
