# GoodDeed

### Small actions, real impact.

GoodDeed is a full-stack community-impact platform designed to connect people who want to help with individuals and organizations that need support. It brings volunteering, item sharing, community projects, and help requests together in one place.

## Overview

GoodDeed aims to make community support more accessible, transparent, and organized by allowing individuals and NGOs to collaborate, share resources, and participate in meaningful initiatives.

## Features

The following features are planned for development:

- **Volunteer Opportunities:** Discover opportunities, apply to participate, and track application status.
- **Community Campaigns:** Find and participate in NGO-organized events and campaigns.
- **Item Sharing and Donations:** List useful items, request supplies, and coordinate their distribution.
- **Help Requests:** Create requests for essential items or other forms of assistance.
- **Community Projects:** Organize and participate in initiatives that create positive local impact.
- **NGO Profiles and Verification:** Help users identify verified organizations.
- **Search and Discovery:** Explore opportunities based on interests, skills, causes, and location.
- **Trust and Safety:** Support reporting, moderation, and appropriate review of sensitive requests.

## Tech Stack

| Technology     | Purpose                                |
| -------------- | -------------------------------------- |
| React          | Frontend user interface                |
| Vite           | Frontend development and build tooling |
| Node.js        | Backend runtime                        |
| Express.js     | REST API and server-side routing       |
| PostgreSQL     | Relational database                    |
| `pg`           | PostgreSQL connectivity from Node.js   |
| Git and GitHub | Version control and collaboration      |

## Project Structure

```text
GoodDeed/
├── client/                 # React + Vite frontend
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # Node.js + Express backend
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── routes/         # API routes
│   │   ├── app.js
│   │   └── server.js
│   ├── .env                # Local environment variables
│   └── package.json
│
├── .gitignore
└── README.md
```

_The structure will evolve as development progresses._

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js
- npm, included with Node.js
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Madhurashastry14/GoodDeed.git
cd GoodDeed
```

### 2. Set Up the Frontend

```bash
cd client
npm install
npm run dev
```

Vite will display the local URL for the frontend, typically `http://localhost:5173`.

### 3. Set Up the Backend

Open a separate terminal:

```bash
cd server
npm install
```

Start the backend using the script configured in `server/package.json`. For example:

```bash
npm run dev
```

The backend will run on `http://localhost:3000` if configured to use port `3000`.

## Project Status

**Status:** In Development
