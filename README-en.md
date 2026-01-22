# PolyMOCK

PolyMOCK is a full-stack prediction market application, designed as a clone/mock of Polymarket. This is a pet project demonstrating a modern web application architecture using FastAPI and React.

## 🚀 Features

- **Prediction Markets**: Browse and trade on various markets.
- **User Authentication**: Secure signup and login using JWT.
- **Wallet & Transactions**: Manage user funds and market positions.
- **Admin Dashboard**: Manage markets and users.
- **Responsive UI**: Built with Tailwind CSS and Shadcn UI.

## 🛠 Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy (Async)
- **Migrations**: Alembic
- **AI**: OpenAI / OpenRouter integration
- **Authentication**: PyJWT, Passlib

### Frontend
- **Framework**: [React](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI, Radix UI
- **State Management**: Zustand, React Query

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database Admin**: Adminer

## 🏁 Getting Started

The easiest way to run the project is using Docker Compose.

### Prerequisites
- Docker and Docker Compose installed on your machine.

### Quick Start (Docker)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd PolyMOCK
   ```

2. **Configure Environment Variables:**
   Copy the example environment file and update it with your settings (especially if you have an OpenRouter API key).
   ```bash
   cp .env-example .env
   ```

3. **Start the Application:**
   ```bash
   docker-compose up -d --build
   ```

   This will start the following services:
   - **Backend**: http://localhost:8000
   - **Frontend**: http://localhost:3000
   - **Database**: PostgreSQL (port 5432)
   - **Adminer** (DB UI): http://localhost:8080

### Local Development

If you prefer to run services individually without Docker:

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -e .
   # or if using uv/poetry based on your preference
   ```

4. Run Migrations:
   Ensure your local PostgreSQL database is running and configured in `.env`.
   ```bash
   alembic upgrade head
   ```

5. Start the Server:
   ```bash
   cd src
   uvicorn main:app --reload
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Development Server:
   ```bash
   npm run dev
   ```
   The frontend will be available at http://localhost:5173 (default Vite port) or the port configured in `vite.config.ts`.

## 📂 Project Structure

```
PolyMOCK/
├── backend/            # FastAPI application
│   ├── alembic/        # Database migrations
│   ├── src/            # Source code (API, Models, Services)
│   └── tests/          # Python tests
├── frontend/           # React application
│   ├── src/            # Source code (Components, Pages, Stores)
│   └── public/         # Static assets
└── docker-compose.yml  # Docker orchestration
```