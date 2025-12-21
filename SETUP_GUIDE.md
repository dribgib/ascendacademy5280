# Ascend Academy 5280 - System Setup Guide

## 1. Architecture: Why this works & Security
This application uses a **"Backend-as-a-Service"** architecture with Supabase. 

### The "Secret" to Live Preview
In a traditional setup, you have `React App -> Node Server -> Database`.
In this setup, we have `React App -> Supabase (Database + API Gateway)`.

The application connects directly to the Supabase cloud over HTTPS. It does not need a running backend server in the container to fetch data.

### Security Model (RLS)
You will notice the `VITE_PUBLIC_SUPABASE_ANON_KEY` is exposed in the browser. **This is intentional.**
*   **The Anon Key** is like the front door key to the building lobby. It lets the browser *connect* to the database.
*   **Row Level Security (RLS)** is the "Bouncer". Just because you are in the lobby doesn't mean you can enter the VIP room.
    *   The database itself checks *who* you are (via your Login Token) before giving you data.
    *   Example: A parent can only see *their own* children because the database policy says `auth.uid() = parent_id`.

---

## 2. Implementation Steps

### A. Database Setup
1.  Go to your **Supabase Dashboard**.
2.  Open the **SQL Editor**.
3.  Copy the content of `supabase_schema.sql` (found in this project) and paste it into the editor.
4.  Click **Run**.
    *   **NOTE:** This script handles "Clean Slate" logic. It will Drop existing tables before creating new ones. This fixes "relation already exists" errors but **will delete existing data** in those custom tables.

### B. Environment Variables
To connect your app to your database:

**For Local Development / Preview:**
Create a `.env` file in the project root:
```
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJh... (Your Project API Key)
```

**For Vercel (Production):**
1.  Go to Vercel Dashboard -> Settings -> Environment Variables.
2.  Add the same variables above.
3.  **Redeploy** your project.

---

## 3. Admin Setup
To make a user an Admin (Coach):

1.  Sign up the user normally on the site.
2.  Open `admin_roles.sql` in this project.
3.  Copy the content.
4.  Go to Supabase > SQL Editor and paste/run the code.
5.  Refresh the application.

**Current Configuration:**
- Admin: `colton@tamerdesigns.com`
- Parent: `colton.joseph@gmail.com`
