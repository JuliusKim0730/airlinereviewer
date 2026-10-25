"use client";

import { useState } from "react";
import CommunityTab from "@/components/CommunityTab";
import ReviewsTab from "@/components/ReviewsTab";

export default function ReviewsPage() {
  const [tab, setTab] = useState<"reviews" | "community">("reviews");
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 text-sm font-medium dark:bg-zinc-800">
        <button className={`rounded-lg py-2 ${tab === "reviews" ? "bg-white shadow-sm dark:bg-zinc-900" : "text-zinc-500"}`} onClick={() => setTab("reviews")}>
          탑승 후기
        </button>
        <button className={`rounded-lg py-2 ${tab === "community" ? "bg-white shadow-sm dark:bg-zinc-900" : "text-zinc-500"}`} onClick={() => setTab("community")}>
          커뮤니티
        </button>
      </div>
      {tab === "reviews" ? <ReviewsTab /> : <CommunityTab />}
    </div>
  );
}
