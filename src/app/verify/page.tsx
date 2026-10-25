import TicketVerifier from "@/components/TicketVerifier";

export default function VerifyPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">보딩패스 인증</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          게스트로도 인증할 수 있어요. 인증하면 지금 이 순간, 부분동행이 열리고 후기에 🎫 인증 표시가 붙어요. 예약번호 원문은 저장하지 않아요.
        </p>
      </header>
      <TicketVerifier />
    </div>
  );
}
