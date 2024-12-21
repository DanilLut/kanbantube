from flask import Flask, request, render_template, jsonify
import os
import re

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

app = Flask(__name__)

def authenticate_youtube_api():
    SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"]
    creds = None

    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "client_secret.json", SCOPES
            )
            creds = flow.run_local_server(port=0)

    with open("token.json", "w") as token:
        token.write(creds.to_json())

    try:
        youtube = build("youtube", "v3", credentials=creds)
        return youtube
    except HttpError as err:
        print(err)

def iso8601_to_hh_mm_ss(duration):
    # Extract hours, minutes, and seconds using a regex
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration)
    if not match:
        return "00:00:00"
    
    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0
    
    # Format as HH:MM:SS
    if hours > 0:
        return f"{hours:02}:{minutes:02}:{seconds:02}"
    else:
        return f"{minutes:02}:{seconds:02}"

def fetch_playlist_videos(youtube, playlist_id):
    videos = []
    
    # Fetch playlist items
    request = youtube.playlistItems().list(
        part="snippet",
        playlistId=playlist_id,
        maxResults=50  # YouTube API limit
    )
    while request:
        response = request.execute()
        videos.extend(response.get("items", []))
        request = youtube.playlistItems().list_next(request, response)
    
    # Extract video IDs
    video_ids = [video["snippet"]["resourceId"]["videoId"] for video in videos]
    
    # Fetch video details (durations) in chunks of 50 (API limit)
    video_details = []
    for i in range(0, len(video_ids), 50):
        video_ids_chunk = video_ids[i:i + 50]
        details_request = youtube.videos().list(
            part="contentDetails",
            id=",".join(video_ids_chunk)
        )
        details_response = details_request.execute()
        video_details.extend(details_response.get("items", []))
    
    # Map video durations by video ID
    video_durations = {
        video["id"]: video["contentDetails"]["duration"]
        for video in video_details
    }
    
    # Build video_data with durations
    video_data = [
        {
            "title": video["snippet"]["title"],
            "thumbnail": video["snippet"]["thumbnails"]["medium"]["url"],
            "url": f"https://www.youtube.com/watch?v={video['snippet']['resourceId']['videoId']}",
            "ownerChannelTitle": video["snippet"].get("videoOwnerChannelTitle", "Unknown"),
            "ownerChannelId": video["snippet"].get("videoOwnerChannelId", "Unknown"),
            "duration": iso8601_to_hh_mm_ss(video_durations.get(video["snippet"]["resourceId"]["videoId"], "Unknown"))
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
    playlist_url = data.get("playlistUrl")

    if not playlist_url:
        return jsonify({"error": "Playlist URL is required"}), 400

    if "list=" in playlist_url:
        playlist_id = playlist_url.split("list=")[1].split("&")[0]
    else:
        return jsonify({"error": "Invalid Playlist URL"}), 400

    try:
        youtube = authenticate_youtube_api()
        result = fetch_playlist_videos(youtube, playlist_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def create_app():
   return app

if __name__ == "__main__":
    from waitress import serve
    serve(app, host="0.0.0.0", port=8080)

