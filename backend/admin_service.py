from fastapi import APIRouter, HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
import logging
from auth_service import get_current_user

logger = logging.getLogger(__name__)
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])

async def get_admin_user(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user

@admin_router.get("/stats")
async def get_stats(request: Request, admin=Depends(get_admin_user)):
    db = request.app.state.db
    users_count = await db.users.count_documents({})
    trailers_cached = await db.trailer_cache.count_documents({})
    favorites_count = await db.favorites.count_documents({})
    news_count = await db.news.count_documents({}) if "news" in await db.list_collection_names() else 0
    return {
        "users": users_count,
        "trailers_cached": trailers_cached,
        "favorites": favorites_count,
        "news": news_count
    }

@admin_router.get("/users")
async def get_users(request: Request, admin=Depends(get_admin_user)):
    db = request.app.state.db
    users = await db.users.find({}, {"password_hash": 0, "_id": 0}).to_list(1000)
    return {"users": users}

class RoleUpdate(BaseModel):
    role: str

@admin_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, payload: RoleUpdate, request: Request, admin=Depends(get_admin_user)):
    db = request.app.state.db
    if payload.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    res = await db.users.update_one({"user_id": user_id}, {"$set": {"role": payload.role}})
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found or role already set")
    return {"ok": True, "message": f"Role updated to {payload.role}"}

@admin_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request, admin=Depends(get_admin_user)):
    db = request.app.state.db
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    res = await db.users.delete_one({"user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.favorites.delete_many({"user_id": user_id})
    return {"ok": True}

@admin_router.post("/cache/clear")
async def clear_cache(request: Request, admin=Depends(get_admin_user)):
    db = request.app.state.db
    res = await db.trailer_cache.delete_many({})
    return {"ok": True, "deleted": res.deleted_count}

@admin_router.get("/sync/status")
async def sync_status(admin=Depends(get_admin_user)):
    return {"status": [
        {"key": "YouTube API", "status": "ok", "inserted": 0, "updated": 0},
        {"key": "AniList", "status": "ok", "inserted": 0, "updated": 0}
    ]}

class AnimeOverride(BaseModel):
    title_romaji: str | None = None
    description: str | None = None
    cover_image: str | None = None
    hidden: bool | None = None

@admin_router.get("/animes/overrides")
async def get_overrides(request: Request, admin=Depends(get_admin_user)):
    db = request.app.state.db
    overrides = await db.anime_overrides.find({}, {"_id": 0}).to_list(1000)
    return {"overrides": overrides}

@admin_router.put("/animes/{anime_id}/override")
async def put_override(anime_id: int, payload: AnimeOverride, request: Request, admin=Depends(get_admin_user)):
    db = request.app.state.db
    update_data = payload.model_dump(exclude_unset=True)
    update_data["anime_id"] = anime_id
    await db.anime_overrides.update_one(
        {"anime_id": anime_id},
        {"$set": update_data},
        upsert=True
    )
    return {"ok": True}

@admin_router.delete("/animes/{anime_id}/override")
async def delete_override(anime_id: int, request: Request, admin=Depends(get_admin_user)):
    db = request.app.state.db
    await db.anime_overrides.delete_one({"anime_id": anime_id})
    return {"ok": True}

async def sync_run(admin=Depends(get_admin_user)):
    return {"ok": True}


# Register the sync/run endpoint properly (decorator must be on the function)
@admin_router.post("/sync/run")
async def sync_run_endpoint(admin=Depends(get_admin_user)):
    return await sync_run(admin)
