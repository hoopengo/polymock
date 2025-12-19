import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI
from src.api.v1.auth import router as auth_router
from src.api.v1.markets import router as markets_router
from src.core.config import settings
from src.services.ai_service import run_market_generation_job

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    logger.info("Starting APScheduler...")
    scheduler.add_job(
        run_market_generation_job,
        IntervalTrigger(hours=24),
        id="market_generation_job",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started. Market generation job scheduled every 24 hours.")

    yield

    # Shutdown
    logger.info("Shutting down APScheduler...")
    scheduler.shutdown()
    logger.info("APScheduler shut down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Prediction Market API with CPMM trading",
    version="1.0.0",
    lifespan=lifespan,
)

# Include API routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(markets_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/api/v1/trigger-market-generation")
async def trigger_market_generation():
    """Manually trigger market generation job (for testing)."""
    await run_market_generation_job()
    return {"status": "triggered", "message": "Market generation job executed"}
