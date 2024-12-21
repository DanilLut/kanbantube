from flask import Flask, request, render_template, jsonify
from dotenv import load_dotenv
import requests
import os

load_dotenv()

app = Flask(__name__)

# Function to fetch playlist videos using YouTube Data API
def fetch_playlist_videos(api_key, playlist_id):
    base_url = "https://www.googleapis.com/youtube/v3/playlistItems"
    params = {
        "part": "snippet",
        "playlistId": playlist_id,
        "maxResults": 50,
        "key": api_key
    }

    videos = []
    while True:
        response = requests.get(base_url, params=params).json()
        if "error" in response:
            return {"error": response["error"]["message"]}
        if "items" in response:
            videos.extend(response["items"])
        if "nextPageToken" in response:
            params["pageToken"] = response["nextPageToken"]
        else:
            break

    video_data = [
        {
            "title": video["snippet"]["title"],
            "thumbnail": video["snippet"]["thumbnails"]["medium"]["url"],
            "url": f"https://www.youtube.com/watch?v={video['snippet']['resourceId']['videoId']}"
        }
        for video in videos
    ]
    return {"videos": video_data}

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    api_key = os.getenv("YT_API_KEY")
    playlist_url = data.get("playlistUrl")

    if not api_key or not playlist_url:
        return jsonify({"error": "API key and Playlist URL are required"}), 400

    # Extract playlist ID from the URL
    if "list=" in playlist_url:
        playlist_id = playlist_url.split("list=")[1].split("&")[0]
    else:
        return jsonify({"error": "Invalid Playlist URL"}), 400

    # Fetch videos
    result = fetch_playlist_videos(api_key, playlist_id)
    return jsonify(result)

def create_app():
   return app

if __name__ == "__main__":
    from waitress import serve
    serve(app, host="0.0.0.0", port=8080)