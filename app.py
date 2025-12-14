from fastapi import FastAPI, Request
import uvicorn

app = FastAPI()

@app.get("/")
def root():
    return {"status": "Athena CAP Bridge v3.4.1 Active"}

@app.post("/sendcap")
async def send_cap(request: Request):
    payload = await request.json()
    cap_id = payload.get("cap_id", "unknown")
    return {
        "cap_id": cap_id,
        "status": "sealed",
        "verified": True,
        "domain": payload.get("domain"),
        "context_mode": payload.get("context_mode"),
        "laurie_version": payload.get("laurie_version", "unknown")
    }

if __name__ == "__main__":
    import os
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))

