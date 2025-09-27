import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[url('/textures/map-parchment.png')] bg-cover bg-fixed p-6 flex items-center justify-center">
      <div className="max-w-3xl mx-auto bg-[#fdf6e3]/95 p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl md:text-4xl font-serif text-[#3b2f2f] drop-shadow-md mb-4">
          ⚓ Uncharted Waters Online Database (FanPage)
        </h1>
        <p className="text-base md:text-lg text-[#3b2f2f] leading-relaxed">
          Welcome to <strong>uwodb.indiesatwar.com</strong> — a new initiative
          to build a unified knowledge hub for{" "}
          <em>Uncharted Waters Online</em>. This project is currently in the{" "}
          <strong>testing phase</strong>.
        </p>
        <p className="mt-6 text-sm md:text-base text-[#3b2f2f]/80">
          Stay tuned as we expand with guides, ship data, and player resources.
        </p>

        {/* Button group */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/db/ships"
            className="px-5 py-2 bg-[#4b2e19] text-[#d4af37] font-medium rounded-md shadow hover:bg-[#6b4226] transition"
          >
            🚢 Explore Ships
          </Link>
        </div>
      </div>
    </main>
  );
}