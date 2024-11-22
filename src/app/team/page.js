"use client";

import AppMenubar from "../menubar";
import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import "@/style/teams.css"
import { decodeJwt } from "@/utils/jwtAuth";

export default function Team() {
  const [teams, setTeams] = useState([]);
  const router = useRouter();

  useEffect(() => {

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    let username = "";

    try {
      const payload = JSON.parse(decodeJwt(token));
      username = payload.username;
    } catch (error) {
      console.error("Failed to decode token:", error);
      localStorage.removeItem("token");
      router.push("/login");
    }

    const fetchUsers = async () => {
      const res = await fetch(`/api/dbConnect/teamsByUname?uname=${username}`);
      const data = await res.json();
      setTeams(data);
    };

    fetchUsers();
  }, [router]);

  const RedirectEditTeams = (e, params) => {
    e.preventDefault();
    router.push(`/team/edit${params}`);
  }

  const RedirectCreateTeam = (e) => {
    e.preventDefault();
    router.push("/team/create")
  }

  const RenderTeams = () => {
    return (
      <div className="teams-field">
        {teams.map((team, index) => (
          <div key={index} className="teams-container" onClick={(e) => RedirectEditTeams(e, `?tid=${team.id}`)}>
            <h2>{team.teamname}</h2>
            <p>Members: {team.memberNum}</p>
            <ul>
              {Array.from({ length: team.memberNum }).map((_, i) => (
                <li key={i}>{team[`uname${i + 1}`]}</li>
              ))}
            </ul>
          </div>
        ))}
        <input className = "teams-create" type="button" value="+" onClick={RedirectCreateTeam}></input>
      </div>
    );
  }

  return (
    <div>
      <AppMenubar />
      <h1>我的隊伍</h1>
      <RenderTeams />
    </div>
  );
}
