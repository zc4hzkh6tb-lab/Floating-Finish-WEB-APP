import LoginForm from "./LoginForm";

export const metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Anmelden</h1>
      <p className="mt-1 text-sm text-neutral-400">Für Backoffice und Team-App</p>
      <LoginForm next={next ?? ""} />
    </div>
  );
}
