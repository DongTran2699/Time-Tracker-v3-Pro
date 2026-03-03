# Deployment Guide: Cloudflare Pages + D1

This application is configured to run on **Cloudflare Pages** with a **D1 Database**.

## Prerequisites

- A Cloudflare account.
- A GitHub/GitLab repository with this code.

## Deployment Steps

1.  **Push Code to Git**: Push this repository to your GitHub/GitLab account.

2.  **Create a D1 Database**:
    - Go to the Cloudflare Dashboard > Workers & Pages > D1.
    - Create a new database (e.g., `worktime-db`).

3.  **Create a Cloudflare Pages Project**:
    - Go to Workers & Pages > Create Application > Pages > Connect to Git.
    - Select your repository.
    - **Build Settings**:
        - Framework preset: `Vite`
        - Build command: `npm run build`
        - Output directory: `dist`

4.  **Bind the Database**:
    - After the project is created (or during setup if available), go to **Settings > Functions > D1 Database Bindings**.
    - Variable name: `DB` (Must be exactly `DB`).
    - Select the database you created in step 2.
    - Redeploy the project if you added the binding after the initial build.

5.  **Initialize the Database**:
    - Once deployed, visit your app URL with the setup path:
      `https://your-project.pages.dev/api/setup`
    - You should see a JSON response: `{"message": "Database initialized..."}`.

## Local Development vs. Production

-   **Local Preview (AI Studio)**: Uses `server.ts` with a local SQLite file (`worktime.db`). This ensures the preview works instantly without complex setup.
-   **Production (Cloudflare)**: Uses `functions/api/[[route]].ts` with Cloudflare D1. This leverages Cloudflare's edge network and serverless database.

## Troubleshooting

-   **"Error: No such table"**: You forgot to visit `/api/setup` or the D1 binding is incorrect.
-   **"500 Internal Server Error"**: Check the Cloudflare Pages logs. Ensure the variable name is `DB`.
