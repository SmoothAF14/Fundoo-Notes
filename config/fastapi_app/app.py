import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import traceback

from fastapi_app.routers import collaborators


@asynccontextmanager
async def lifespan(app: FastAPI):
    
    # Startup
    print("FastAPI app starting up...")
    yield
    # Shutdown
    print("FastAPI app shutting down...")


# Create FastAPI app
app = FastAPI(
    title="FundooNotes FastAPI",
    description="FastAPI implementation for collaborators endpoints in FundooNotes",
    version="1.0.0",
    lifespan=lifespan
)

# Configure logging to ensure exceptions are visible in the server output
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fastapi_app")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(collaborators.router)


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc)},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    
    # Log full traceback to the server logs for diagnosis
    logger.exception("Unhandled exception in request: %s", exc)
    tb = traceback.format_exc()
    logger.error("Traceback:\n%s", tb)
    # Return a generic 500 response but include the error message for local debugging
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )


@app.get("/", tags=["Health"])
async def root():
    
    return {"message": "FundooNotes FastAPI is running"}


@app.get("/health", tags=["Health"])
async def health():
    
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
