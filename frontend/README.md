# Frontend — Angular 17

Standalone-component Angular app for the BattleBots Win Predictor. Calls the
FastAPI backend at `http://localhost:8000`.

## Setup
```bash
cd frontend
npm install
npm start
```
Open http://localhost:4200

> Make sure the backend is running first (see `../backend/README.md`).
> The API base URL lives in `src/app/services/battlebots.service.ts`.

## Structure
```
src/app/
├── app.component.*            # shell: header, layout, data loading
├── components/
│   ├── predictor/             # matchup picker + prediction result
│   └── leaderboard/           # win-rate ranking table
├── services/battlebots.service.ts   # HTTP calls to the API
└── models/battlebots.models.ts      # typed interfaces
```
