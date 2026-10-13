# Fatiin Multimedia Mosque IT Helpdesk

Fatiin Multimedia Mosque IT Helpdesk built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, Supabase, and Biome.

Users can sign in with Supabase Auth, submit tickets, and view their own ticket details. Designated helpdesk staff can review the shared ticket list, update statuses, and manage assets and devices. Optional email notifications use Resend.

## Development setup

Use Ubuntu in WSL2 for the project commands. Node.js 22 LTS is managed with nvm.

    nvm install 22
    nvm use 22
    cd /home/zuhair/projects/fatiin-helpdesk
    npm install
    cp .env.example .env.local
    npm run dev

Open http://localhost:3000. Set the Supabase URL and publishable key in `.env.local` before using sign-in or ticketing.

## Checks

    npm run lint
    npm run typecheck
    npm test
    npm run check
    npm run build

GitHub Actions runs `npm run check` for every push and pull request.

## Supabase configuration

The app uses `@supabase/supabase-js` and `@supabase/ssr`. Add your Supabase project URL and publishable key to `.env.local` using `.env.example` as a guide.

### Configure email notifications (optional)

Email notifications use Resend's email API. Create an API key in Resend, verify a sending domain, then set `RESEND_API_KEY`, `EMAIL_FROM` (an address on that verified domain), `HELPDESK_NOTIFICATION_EMAIL`, and `APP_BASE_URL` in `.env.local`. Keep the Resend API key server-side; it must not use a `NEXT_PUBLIC_` name. New requests and requester replies notify the helpdesk address; status changes and staff replies notify the requester. Without these settings, ticket and conversation updates still save, and the app reports that email is not configured.

Keep .env.local and all real credentials out of version control. Never put a Supabase secret or service-role key in a NEXT_PUBLIC_ variable or browser code.

### Apply the database migrations

In the Supabase dashboard for the project configured in `.env.local`, open **SQL Editor** and run the files in `supabase/migrations/` in timestamp order. This creates the request list, staff membership list, private attachments, request conversations and assignment, equipment list, request-to-equipment links, mosque and client-site links, device monitoring, sustained health alerts, and access rules.

After applying all nineteen migrations, add the UUID for each trusted helpdesk staff account to `public.helpdesk_staff` from SQL Editor. Get the UUID from **Authentication → Users**. For example:

    insert into public.helpdesk_staff (user_id)
    values ('PASTE-STAFF-USER-UUID-HERE');

Only listed accounts can open the shared queue, change ticket status, claim requests, or reply as helpdesk staff. Do not add general helpdesk requesters to this table.


## Current scope

- Next.js App Router with TypeScript and Tailwind CSS
- Biome linting and formatting configuration
- shadcn/ui configuration ready for components
- Supabase JavaScript client package ready
- branded landing page and Supabase sign-in
- protected staff page, private ticket submission/listing, and ticket detail pages
- requesters can search tickets by title, filter by status or mosque, and view priority
- requesters select the mosque or client site for each request; staff can correct existing requests
- staff maintain a shared site list used by request and equipment forms
- requester request list shows the latest conversation reply and its timestamp, with recently active requests first
- Atera-style staff ticket queue with ticket types, priorities, assignment, and status updates
- staff dashboard cards for open, critical, and unassigned tickets
- staff can generate printable monthly request and current equipment summaries by site
- staff can search requests by subject and filter by status, category, linked equipment, site, and priority
- requesters can choose a priority; staff can revise it, and critical tickets sort first
- optional private image/PDF attachment on each request (5 MB maximum)
- staff can claim and release tickets to show who is handling each request
- staff-only equipment list with search, site filters, and status updates
- staff-only endpoint monitoring enrollment with heartbeat, CPU, memory, disk, Defender, and restart status
- sustained CPU, memory, and disk health alerts that staff can turn into linked tickets
- Windows endpoint agent with protected token storage, five-minute heartbeats, and an uninstaller
- staff can edit asset tags, names, categories, locations, and notes
- each item is linked to a mosque or client site from the shared list and can be searched by site
- staff can link a registered asset to a support request
- request categories and equipment categories are kept separate
- requesters and staff can exchange private ticket messages with email alerts
- requester follow-ups automatically reopen resolved or closed requests
- optional Resend email notifications for new requests and status changes
- example environment file and migration directory
- lint, test, and production build commands

RLS lets authenticated users create and read only their own tickets; designated staff can read the shared queue, update ticket status, and access the staff-only asset register and ticket links.

### Endpoint monitoring

Migration `20261013001300_add_endpoint_monitoring.sql` adds device enrollment and heartbeat history. Add the Supabase **service role key** to `.env.local` as `SUPABASE_SERVICE_ROLE_KEY` for the server-side heartbeat endpoint; never expose it to browser code. Staff enroll an existing asset at `/staff/monitoring`. The device token is displayed once and only its SHA-256 hash is stored.

The Windows agent in `scripts/windows/` sends `POST /api/monitoring/heartbeat` every five minutes. Along with CPU load, used memory, and system-drive usage, it reports Microsoft Defender real-time protection, the last signature update time, and whether Windows reports a pending restart. The endpoint uses the server-side service role key to authenticate devices and store readings. A device is shown as online after a check-in within 10 minutes. No remote access or command execution is included.

#### Install on a Windows device

1. Confirm migrations 013 and 019 have been applied, the server-side service role key is configured, and the helpdesk is available over HTTPS from the device.
2. Open **Staff → Monitoring**, enroll an existing asset, and keep the one-time device ID and token available.
3. Copy the full `scripts/windows/` folder onto the Windows device. Open PowerShell as Administrator in that folder and run:

       .\Install-FatiinEndpointAgent.ps1

4. Enter the helpdesk base URL, device ID, and token when prompted. The token prompt is hidden. The installer saves it under `%ProgramData%\FatiinEndpointAgent` with access limited to Windows SYSTEM and local Administrators, registers a startup task, and starts the agent. Check **Staff → Monitoring** for the first check-in; it can take up to five minutes.

The agent log is `%ProgramData%\FatiinEndpointAgent\agent.log`. To remove the scheduled task and local token/configuration, run `Uninstall-FatiinEndpointAgent.ps1` as Administrator and type `REMOVE` at its confirmation prompt. The device remains in the helpdesk inventory; pause or remove it there separately.

To update an enrolled agent, copy the latest `scripts/windows/` folder to the device and run `Update-FatiinEndpointAgent.ps1` as Administrator. This replaces the agent script while keeping the existing device ID, token, and scheduled task.
