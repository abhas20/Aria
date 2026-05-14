## Aria

### Contributing
- **Fork the repository** and **create a new branch** for your feature or bug fix.
- Run the following commands to set up your development environment:
```bash
git clone <repository_url>
git checkout -b feature/your-feature-name

# Make your changes and commit them
git add .
git commit -m "Add your commit message here"
git push origin feature/your-feature-name
```

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