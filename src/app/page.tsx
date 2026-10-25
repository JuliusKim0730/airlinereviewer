import TicketVerifier from "@/components/TicketVerifier";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">내가 탄 비행기</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          보딩패스를 인증하면 항공편 정보, 후기, 여행지 상품과 동행이 열립니다.
        </p>
      </header>
      <TicketVerifier />
    </main>
  );
}
