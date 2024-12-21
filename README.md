# KanbanTube

A Flask-based web application that uses the YouTube API allowing users to create a Kanban board and organize videos from a YouTube playlist into columns.

## How to use

1. Clone the repo:

```bash
git clone https://github.com/DanilLut/yt-playlist-kanban.git
```

2. Create a virtual environment

```bash
python -m venv .venv
```

3. Activate the virtual environment

```bash
. .venv/bin/activate
```

4. Install the requirements

```bash
pip install -r requirements.txt
```

5. Rename `.env.example` to `.env` and put your [YouTube API key](https://console.cloud.google.com/apis/library) there

5. Run the server

```bash
./serve.sh
```
