## Aria

### Frontend Setup

```bash
cd web
npm install
npm run dev
```
### Backend Setup

```bash
cd backend
# Method 1: Using pip

# only first time 
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
# to run the server
uvicorn main:app --reload # or use (python -m uvicorn main:app --reload)

# Method 2: Using uv
uv venv
uv pip install -r requirements.txt # or use (uv sync)
source venv/bin/activate  # On Windows: venv\Scripts\activate
alembic upgrade head
uv run uvicorn main:app --reload
```