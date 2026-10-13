import { SignInForm } from "@/components/sign-in-form";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f7f2] text-[#182c24]">
      <div
        aria-hidden="true"
        className="absolute -right-28 -top-36 h-[28rem] w-[28rem] rounded-full bg-[#e0eadf] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-48 -left-32 h-[30rem] w-[30rem] rounded-full bg-[#e9e4d6] blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between">
          <a
            href="#home"
            className="flex items-center gap-3"
            aria-label="Fatiin Multimedia Helpdesk home"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-[#164b38] text-[#f5f5e9] shadow-sm">
              <svg viewBox="0 0 32 32" fill="none" className="size-6" aria-hidden="true">
                <path d="M7 26V15a9 9 0 0 1 18 0v11" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 26v-9a4 4 0 0 1 8 0v9M5 26h22"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="16" cy="7" r="1.5" fill="currentColor" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-wide">FATIIN MULTIMEDIA</span>
              <span className="mt-1 block text-xs text-[#65776e]">Mosque IT Helpdesk</span>
            </span>
          </a>
          <span className="hidden rounded-full border border-[#d9e1d7] bg-white/70 px-4 py-2 text-xs font-medium text-[#50685b] sm:inline-flex">
            Support portal
          </span>
        </header>

        <section
          id="home"
          className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:py-20"
        >
          <div className="mx-auto max-w-xl lg:mx-0">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d8e2d8] bg-white/65 px-3.5 py-2 text-xs font-medium text-[#426452]">
              <span className="size-1.5 rounded-full bg-[#4b8a62]" />A calmer way to get technical
              help
            </p>
            <h1 className="max-w-lg text-4xl font-semibold leading-[1.12] tracking-[-0.04em] text-[#17392b] sm:text-5xl lg:text-6xl">
              Here to keep your community connected.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[#61736a] sm:text-lg sm:leading-8">
              Submit support tickets, follow replies and progress, and keep equipment connected
              to the mosque or client site it serves.
            </p>

            <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#e0e6dd] bg-white/75 p-4">
                <div
                  className="mb-3 grid size-9 place-items-center rounded-xl bg-[#edf3eb] text-[#326449]"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
                    <path
                      d="M12 7v5l3.2 2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="text-sm font-semibold">Ticket tracking</p>
                <p className="mt-1 text-xs leading-5 text-[#708077]">
                  Submit a ticket and follow its status and replies in one place.
                </p>
              </div>
              <div className="rounded-2xl border border-[#e0e6dd] bg-white/75 p-4">
                <div
                  className="mb-3 grid size-9 place-items-center rounded-xl bg-[#edf3eb] text-[#326449]"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
                    <path
                      d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold">Mosque and client sites</p>
                <p className="mt-1 text-xs leading-5 text-[#708077]">
                  Keep tickets and assets linked to their customer site.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_24px_80px_-32px_rgba(24,55,39,0.24)] backdrop-blur sm:p-9">
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b8173]">
                  Welcome
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#17392b]">
                  Sign in to your helpdesk
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#758179]">
                  Submit a support ticket or follow up on one you already raised.
                </p>
              </div>

              <SignInForm />
              <p className="mt-5 rounded-xl bg-[#f4f6f0] px-4 py-3 text-center text-xs leading-5 text-[#627267]">
                Sign in with your helpdesk account. Staff tools appear for designated team members.
              </p>
              <p className="mt-6 text-center text-xs text-[#89958c]">
                Need an account? Contact your helpdesk administrator.
              </p>
            </div>
            <p className="mt-5 text-center text-xs text-[#87938a]">
              For Fatiin Multimedia staff, volunteers, and client contacts
            </p>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-[#dfe5dc] py-5 text-xs text-[#839087] sm:flex-row sm:items-center sm:justify-between">
          <span>Fatiin Multimedia Mosque IT Helpdesk</span>
          <span>Built to support the people who keep the community connected.</span>
        </footer>
      </div>
    </main>
  );
}
