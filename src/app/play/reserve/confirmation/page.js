//src\app\play\reserve\confirmation\page.js
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppMenubar from "../../../components/menubar";

export default function Confirmation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamDetails, setTeamDetails] = useState(null);

  const teamId = searchParams.get("team");
  const date = searchParams.get("date");
  const first = searchParams.get("first");
  const second = searchParams.get("second");
  const third = searchParams.get("third");

  useEffect(() => {
    if (teamId) {
      fetchTeamDetails(teamId);
    }
  }, [teamId]);

  const fetchTeamDetails = async (tid) => {
    try {
      const response = await fetch(`/api/dbConnect/teamByTid?tid=${tid}`);
      if (response.ok) {
        const teamData = await response.json();
        setTeamDetails(teamData);
      }
    } catch (error) {
      console.error("Error fetching team details:", error);
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reserve_courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          teamId,
          preferences: { first, second, third },
        }),
      });

      if (response.ok) {
        alert("預約成功！");
        router.push("/play/reserve");
      } else {
        const error = await response.json();
        alert(`預約失敗: ${error.message}`);
      }
    } catch (error) {
      alert("預約過程發生錯誤，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!teamDetails) {
    return <div>載入中...</div>;
  }

  return (
    <div>
      <AppMenubar />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">確認預約資訊</h1>

        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">請確認以下資訊</h2>

          <div className="space-y-4">
            <div>
              <p className="font-medium">隊伍名稱:</p>
              <p>{teamDetails.teamname}</p>
            </div>

            <div>
              <p className="font-medium">日期:</p>
              <p>{date}</p>
            </div>

            <div>
              <p className="font-medium">志願時段:</p>
              <ul className="list-disc pl-5">
                {first && <li>第一志願: {first}</li>}
                {second && <li>第二志願: {second}</li>}
                {third && <li>第三志願: {third}</li>}
              </ul>
            </div>

            <div>
              <p className="font-medium">隊伍成員:</p>
              <ul className="list-disc pl-5">
                {Array.from({ length: teamDetails.memberNum }).map((_, idx) => (
                  <li key={idx}>{teamDetails[`uname${idx + 1}`]}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            {/* 確認登記按鈕 */}
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
              style={{
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? '處理中...' : '確認預約'}
            </button>
            
            {/* 返回按鈕 */}
            <button
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors disabled:bg-gray-300"
              style={{
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              返回
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
