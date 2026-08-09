from fastapi import FastAPI, APIRouter, HTTPException, Query, Request
from fastapi.responses import Response, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
import re
import time
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone

import httpx

from news_service import fetch_all_sources, build_home, filter_items
from news_sources import NEWS_SOURCES
from video_service import fetch_youtube_channel_videos, fetch_prime_catalog
from auth_service import auth_router
from profile_service import profile_router
from favorites_service import favorites_router
from rating_service import rating_router
from admin_service import admin_router

from trailer_service import sync_multilingual_trailers, get_trailers_for_series, youtube_search_multilang, classify_versions

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ==== Base Models ====
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


# ==== In-memory news cache ====
NEWS_CACHE: dict = {
    "items": [],
    "sources": [],
    "updated_at": None,
    "loading": False,
    "loaded_at": 0.0,
}
NEWS_TTL_SECONDS = 900  # 15 min

VIDEOS_CACHE: dict = {"items": [], "loaded_at": 0.0, "loading": False}
PRIME_CACHE: dict = {"items": [], "loaded_at": 0.0, "loading": False}
VIDEO_TTL_SECONDS = 3600  # 1h


async def _load_videos(force: bool = False) -> List[Dict]:
    now = time.time()
    if not force and VIDEOS_CACHE["items"] and (now - VIDEOS_CACHE["loaded_at"]) < VIDEO_TTL_SECONDS:
        return VIDEOS_CACHE["items"]
    if VIDEOS_CACHE["loading"]:
        for _ in range(30):
            await asyncio.sleep(0.5)
            if not VIDEOS_CACHE["loading"]:
                break
        return VIDEOS_CACHE["items"]
    VIDEOS_CACHE["loading"] = True
    try:
        items = await fetch_youtube_channel_videos()
        VIDEOS_CACHE["items"] = items
        VIDEOS_CACHE["loaded_at"] = now
    finally:
        VIDEOS_CACHE["loading"] = False
    return VIDEOS_CACHE["items"]


async def _load_prime(force: bool = False) -> List[Dict]:
    now = time.time()
    if not force and PRIME_CACHE["items"] and (now - PRIME_CACHE["loaded_at"]) < VIDEO_TTL_SECONDS:
        return PRIME_CACHE["items"]
    if PRIME_CACHE["loading"]:
        for _ in range(120): # Increased wait time since 4000 items takes longer
            await asyncio.sleep(0.5)
            if not PRIME_CACHE["loading"]:
                break
        return PRIME_CACHE["items"]
    PRIME_CACHE["loading"] = True
    try:
        items = await fetch_prime_catalog(limit=4000)
        PRIME_CACHE["items"] = items
        PRIME_CACHE["loaded_at"] = now
    finally:
        PRIME_CACHE["loading"] = False
    return PRIME_CACHE["items"]


async def _load_news(force: bool = False) -> dict:
    now = time.time()
    if not force and NEWS_CACHE["items"] and (now - NEWS_CACHE["loaded_at"]) < NEWS_TTL_SECONDS:
        return NEWS_CACHE
    if NEWS_CACHE["loading"]:
        # wait a bit for concurrent load
        for _ in range(60):
            await asyncio.sleep(0.5)
            if not NEWS_CACHE["loading"]:
                break
        return NEWS_CACHE
    NEWS_CACHE["loading"] = True
    try:
        result = await fetch_all_sources()
        NEWS_CACHE["items"] = result["items"]
        NEWS_CACHE["sources"] = result["sources"]
        NEWS_CACHE["updated_at"] = result["updated_at"]
        NEWS_CACHE["loaded_at"] = now
        # persist a lightweight snapshot to Mongo for durability
        try:
            await db.news_snapshot.replace_one(
                {"_id": "latest"},
                {"_id": "latest", "updated_at": result["updated_at"], "count": len(result["items"])},
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"News snapshot persist failed: {e}")
    finally:
        NEWS_CACHE["loading"] = False
    return NEWS_CACHE


# ==== Routes ====
@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# ==== Video / Prime Endpoints ====
@api_router.get("/videos")
async def videos_list(
    platform: str = "youtube",
    limit: int = Query(80, ge=1, le=2000),
):
    if platform != "youtube":
        return {"videos": []}
    items = await _load_videos()
    return {"videos": items[:limit], "count": len(items)}


@api_router.get("/prime/catalog")
async def prime_catalog(limit: int = Query(4000, ge=1, le=5000)):
    items = await _load_prime()
    
    # Apply local overrides
    try:
        overrides = await db.anime_overrides.find({}, {"_id": 0}).to_list(1000)
        overrides_map = {o["anime_id"]: o for o in overrides}
        
        final_items = []
        for it in items:
            ov = overrides_map.get(it["id"])
            if ov:
                if ov.get("hidden"):
                    continue
                
                # We do a shallow copy to not mutate the global cache
                it_copy = dict(it)
                it_copy["title"] = dict(it.get("title", {}))
                it_copy["coverImage"] = dict(it.get("coverImage", {}))
                
                if ov.get("title_romaji"):
                    it_copy["title"]["romaji"] = ov["title_romaji"]
                if ov.get("description"):
                    it_copy["description"] = ov["description"]
                if ov.get("cover_image"):
                    it_copy["coverImage"]["large"] = ov["cover_image"]
                    it_copy["coverImage"]["extraLarge"] = ov["cover_image"]
                
                final_items.append(it_copy)
            else:
                final_items.append(it)
        
        items = final_items
    except Exception as e:
        logger.error(f"Failed to apply overrides: {e}")
        
    return {"items": items[:limit], "count": len(items)}



@api_router.get("/prime/multilingual-trailers")
async def multilingual_trailers(request: Request, q: str):
    if not q:
        return {"results": {}}
    db = request.app.state.db
    # 1) Trailers previously synced from official channels (RSS, no quota cost)
    rss = await get_trailers_for_series(q, db)
    rss_candidates = []
    for _lang, items in (rss or {}).items():
        for it in items or []:
            if isinstance(it, dict) and it.get("id"):
                rss_candidates.append(it)
            elif isinstance(it, str):
                rss_candidates.append({"id": it, "title": "", "source": ""})

    # 2) Real, embeddable trailers via YouTube Data API, classified by ACCURATE
    #    version (vo / vostfr / vf / ensub / endub). Cached to conserve quota.
    versions = {}
    try:
        versions = await youtube_search_multilang(q, db) or {}
    except Exception as e:
        logger.warning(f"youtube_search_multilang failed for '{q}': {e}")

    # Fold RSS trailers through the same classifier and merge (dedup by id).
    rss_versions = classify_versions(rss_candidates)
    merged = {}
    for code in set(list(versions.keys()) + list(rss_versions.keys())):
        seen, lst = set(), []
        for v in (versions.get(code, []) + rss_versions.get(code, [])):
            if v.get("id") and v["id"] not in seen:
                seen.add(v["id"])
                lst.append(v)
        if lst:
            merged[code] = lst[:5]

    return {"results": merged}


# ==== News Endpoints ====
@api_router.get("/news/home")
async def news_home():
    cache = await _load_news()
    return build_home(cache["items"], cache["sources"], cache["updated_at"] or datetime.now(timezone.utc).isoformat())


@api_router.get("/news")
async def news_list(
    category: Optional[str] = None,
    source: Optional[str] = None,
    q: Optional[str] = None,
    sort: str = "trending",
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    cache = await _load_news()
    return filter_items(cache["items"], category=category, source=source, query=q, sort=sort, limit=limit, offset=offset)


# ==== Lova-Bot Chat Endpoint ====
class ChatMessageRequest(BaseModel):
    messages: List[Dict[str, str]]
    bot_type: str = "lova-bot"

@api_router.post("/chat/lovanet")
async def lovanet_chat(payload: ChatMessageRequest):
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="Missing API Key")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
        from fastapi.responses import StreamingResponse
        import json
    except ImportError:
        raise HTTPException(status_code=500, detail="emergentintegrations library not installed")

    bot_prompts = {
        "lova-bot": "Tu es Lova-Bot, un assistant amical, joyeux et enthousiaste. Tu guides les utilisateurs sur la plateforme Lovanet (animés, mangas, boutique).",
        "lova-ai": "Tu es Lova-AI, une intelligence cristalline connectée, sérieuse, technologique et précise. Tu donnes des recommandations pointues sur l'univers Lovanet.",
        "lova-king": "Tu es Lova King AI, l'esprit millénaire, majestueux et protecteur. Tu parles avec sagesse et autorité, protégeant l'écosystème Lovanet."
    }

    system_prompt = bot_prompts.get(payload.bot_type, bot_prompts["lova-bot"])

    # Flatten conversation history into the system prompt or just send the last message
    # For a simple implementation, we can just send the last user message along with context
    last_user_message = next((m["content"] for m in reversed(payload.messages) if m["role"] == "user"), "")
    if not last_user_message:
        raise HTTPException(status_code=400, detail="No user message found")

    chat = LlmChat(
        api_key=key,
        session_id=f"lovanet-chat-{uuid.uuid4()}",
        system_message=system_prompt,
    ).with_model("gemini", "gemini-2.5-flash-lite")

    async def event_generator():
        try:
            async for ev in chat.stream_message(UserMessage(text=last_user_message)):
                if isinstance(ev, TextDelta):
                    yield ev.content
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logger.error(f"Chat stream error: {e}")
            yield "Désolé, j'ai eu un problème de connexion."

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@api_router.get("/news/sources")
async def news_sources_list():
    cache = await _load_news()
    return {"sources": cache["sources"], "updated_at": cache["updated_at"]}


@api_router.get("/news/image-proxy")
async def news_image_proxy(url: str):
    """Proxy remote images to avoid CORS/hotlink issues."""
    if not url or not url.startswith("http"):
        raise HTTPException(status_code=400, detail="URL requise")
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as hc:
            r = await hc.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; LovanetProxy/1.0)"})
            r.raise_for_status()
            content_type = r.headers.get("content-type", "image/jpeg")
            return Response(content=r.content, media_type=content_type, headers={"Cache-Control": "public, max-age=86400"})
    except Exception as e:
        logger.warning(f"image-proxy failed for {url}: {e}")
        raise HTTPException(status_code=502, detail="Image indisponible")


@api_router.get("/news/{slug}")
async def news_detail(slug: str):
    cache = await _load_news()
    item = next((i for i in cache["items"] if i["slug"] == slug), None)
    if not item:
        raise HTTPException(status_code=404, detail="Article introuvable")
    # related: same category, different item, sorted by trending
    primary_cat = (item.get("categories") or ["anime"])[0]
    related = [
        i for i in cache["items"]
        if i["slug"] != slug and primary_cat in i.get("categories", [])
    ]
    related.sort(key=lambda x: x["trending_score"], reverse=True)
    return {"item": item, "related": related[:8], "source": item.get("source_name")}


@api_router.post("/sync/news")
async def news_sync():
    cache = await _load_news(force=True)
    return {"ok": True, "count": len(cache["items"]), "sources": len(cache["sources"]), "updated_at": cache["updated_at"]}


# ==== Translate Endpoint (LLM-powered batch translation) ====
class TranslateRequest(BaseModel):
    texts: List[str]
    target_lang: str = "fr"
    source_lang: str = "auto"


LANG_LABELS = {
    "fr": "French", "en": "English", "es": "Spanish", "de": "German",
    "it": "Italian", "pt": "Portuguese", "ja": "Japanese", "ko": "Korean",
    "zh": "Simplified Chinese", "ar": "Arabic", "hi": "Hindi", "ru": "Russian",
    "nl": "Dutch", "tr": "Turkish", "pt-br": "Brazilian Portuguese",
}

# Simple in-memory translation cache
TRANSLATE_CACHE: dict = {}


async def _translate_batch(texts: List[str], target_lang: str) -> List[str]:
    """Batch translate. Priority:
    1) FREE: Google Translate via deep-translator (no API key)
    2) FALLBACK: EMERGENT_LLM_KEY via gpt-4o-mini (paid)
    """
    if not texts:
        return []

    # 1) FREE Google Translate via deep-translator (async wrapped)
    try:
        from deep_translator import GoogleTranslator
        loop = asyncio.get_event_loop()

        def _sync_translate(batch: List[str]) -> List[str]:
            # Map our codes to Google's when they differ
            tgt = target_lang.lower()
            if tgt == "pt-br":
                tgt = "pt"
            translator = GoogleTranslator(source="auto", target=tgt)
            out: List[str] = []
            for txt in batch:
                try:
                    r = translator.translate(txt) or txt
                    out.append(r)
                except Exception as e:
                    logger.warning(f"deep-translator single failed: {e}")
                    out.append(txt)
            return out

        translated = await loop.run_in_executor(None, _sync_translate, texts)
        if translated and len(translated) == len(texts):
            return translated
    except Exception as e:
        logger.warning(f"deep-translator batch failed: {e}")

    # 2) LLM fallback
    key = os.environ.get("EMERGENT_LLM_KEY")
    lang_label = LANG_LABELS.get(target_lang.lower(), target_lang)
    if not key:
        return texts  # passthrough
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json as _json
        chat = LlmChat(
            api_key=key,
            session_id=f"translate-{target_lang}-{int(time.time())}",
            system_message=(
                f"You are a professional translator. Translate every input string into {lang_label}. "
                f"Keep proper nouns, names of anime, brands, and URLs unchanged. "
                f"Return ONLY a JSON array of translated strings, in the SAME ORDER as input. No commentary."
            ),
        ).with_model("gemini", "gemini-2.5-flash-lite")
        payload = _json.dumps(texts, ensure_ascii=False)
        resp = await chat.send_message(UserMessage(text=payload))
        text = (resp or "").strip()
        # try to extract JSON array
        m = re.search(r"\[.*\]", text, re.DOTALL)
        arr = _json.loads(m.group(0)) if m else _json.loads(text)
        if isinstance(arr, list) and len(arr) == len(texts):
            return [str(x) for x in arr]
    except Exception as e:
        logger.warning(f"LLM translate failed: {e}")
    return texts


@api_router.post("/translate")
async def translate(payload: TranslateRequest):
    target = (payload.target_lang or "fr").lower()
    if target == "auto" or not target:
        target = "fr"

    # cache lookup
    to_translate: List[str] = []
    indexes: List[int] = []
    results: List[str] = [""] * len(payload.texts)
    for i, txt in enumerate(payload.texts):
        norm = (txt or "").strip()
        if not norm:
            results[i] = ""
            continue
        cache_key = f"{target}::{norm}"
        cached = TRANSLATE_CACHE.get(cache_key)
        if cached is not None:
            results[i] = cached
        else:
            to_translate.append(norm)
            indexes.append(i)

    if to_translate:
        # split into chunks of 30 for reliable JSON parsing
        translated: List[str] = []
        chunk = 30
        for start in range(0, len(to_translate), chunk):
            batch = to_translate[start:start + chunk]
            out = await _translate_batch(batch, target)
            if len(out) != len(batch):
                out = batch
            translated.extend(out)
        for idx, src, dst in zip(indexes, to_translate, translated):
            results[idx] = dst
            TRANSLATE_CACHE[f"{target}::{src}"] = dst

    return {
        "target_lang": target,
        "translations": [
            {
                "original_text": payload.texts[i],
                "translated_text": results[i] or payload.texts[i],
                "from_cache": False,
                "detected_source_lang": payload.source_lang,
            }
            for i in range(len(payload.texts))
        ],
    }


# Include the router in the main app
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(favorites_router)
app.include_router(rating_router)
app.include_router(admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def _prefetch_popular_trailers():
    """Progressively pre-fill the multilingual trailer cache for the most
    popular anime. Runs gently and respects the API quota cooldown, so it
    fills up over time (and resumes automatically after the daily reset)."""
    await asyncio.sleep(60)  # let the prime catalog warm first
    while True:
        try:
            items = await _load_prime()
            ranked = sorted(items, key=lambda x: x.get("score") or 0, reverse=True)[:300]
            filled = 0
            for it in ranked:
                title = it.get("title")
                if not title:
                    continue
                try:
                    res = await youtube_search_multilang(title, db)
                    if res:
                        filled += 1
                except Exception:
                    pass
                await asyncio.sleep(4)  # gentle pacing
            logger.info(f"Trailer prefetch pass complete ({filled} titles with cached trailers).")
        except Exception as e:
            logger.warning(f"Trailer prefetch failed: {e}")
        await asyncio.sleep(6 * 3600)  # re-run periodically to catch quota resets


@app.on_event("startup")
async def on_startup():
    app.state.db = db
    
    # Seed Test User
    from auth_service import hash_password
    test_email = "test@lovanet.com"
    existing_test = await db.users.find_one({"email": test_email})
    if not existing_test:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": test_email,
            "name": "Test User",
            "password_hash": hash_password("password123"),
            "role": "user",
            "created_at": datetime.now(timezone.utc)
        })

    logger.info("Backend startup: warming caches (news, videos, prime) in background...")
    asyncio.create_task(_load_news())
    asyncio.create_task(_load_videos())
    asyncio.create_task(_load_prime())


    asyncio.create_task(sync_multilingual_trailers(db))
    asyncio.create_task(_prefetch_popular_trailers())
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
