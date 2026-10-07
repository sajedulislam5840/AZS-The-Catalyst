from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.auth import router as auth_router

app = FastAPI(title="EduTrack API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# router-এ ইতিমধ্যেই prefix="/auth" দেওয়া আছে, তাই এখানে শুধু prefix="/api/v1" হবে
app.include_router(auth_router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "healthy"}