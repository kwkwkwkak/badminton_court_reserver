"use client";

import React, { useState, useEffect } from "react";
import AppMenubar from "../components/menubar";
import { decodeJwt } from "@/utils/jwtAuth";
import { useRouter } from "next/navigation";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import "./page.css";

export default function RecordPage() {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // For lazy loading state
  const [lazyState, setLazyState] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
    filters: {
      'teamName': { value: null, matchMode: 'contains' },
      'date': { value: null, matchMode: 'contains' }
    }
  });

  const totalRecords = records.length;

  const formatDate = (dateString) => {
    if (!dateString) return "未提供";
    return new Date(dateString).toISOString().split("T")[0];
  };

  const checkStatus = (isWaitlist) => {
    return isWaitlist ? "候補中" : "已登記";
  };

  const fetchUserRecords = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const payload = JSON.parse(decodeJwt(token));

      // Fetch teams by username
      const teamsResponse = await fetch(
        `/api/dbConnect/teamsByUname?uname=${payload.username}`
      );
      if (!teamsResponse.ok) {
        throw new Error("Failed to fetch teams");
      }

      const teamsData = await teamsResponse.json();

      const courtsPromises = teamsData.map((team) =>
        fetch(`/api/courts?teamId=${team.id}&includeWaitlist=true`).then((res) =>
          res.json()
        )
      );

      const courtsData = await Promise.all(courtsPromises);

      // Combine and flatten team and court data
      const formattedRecords = [];
      teamsData.forEach((team, index) => {
        const teamCourts = courtsData[index]; // Courts associated with this team
        teamCourts.forEach((court) => {
          const teams = court.teams;
          const isWaitlisted = (court.waitlistTeams || []).includes(team.id);

          if (teams[team.id] || isWaitlisted) {
            formattedRecords.push({
              id: `${team.id}-${court.date}-${court.timeSlot}`,
              teamName: team.teamname,
              teamId: team.id,
              date: formatDate(court.date),
              time: court.timeSlot,
              status: checkStatus(isWaitlisted),
              venue: isWaitlisted ? "候補中" : teams[team.id] || "未提供",
              originalDate: court.date,
              isWaitlisted: isWaitlisted
            });
          }
        });
      });

      // Sort records by date in descending order (most recent first)
      const sortedRecords = formattedRecords.sort((a, b) => {
        return new Date(b.originalDate) - new Date(a.originalDate);
      });

      // Sort by team name
      const finalRecords = sortedRecords.sort((a, b) => {
        if (a.teamName < b.teamName) return -1;
        if (a.teamName > b.teamName) return 1;
        return 0;
      });

      setRecords(finalRecords);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCancelRegistration = async (record) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/courts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: record.originalDate,
          timeSlot: record.time,
          cancelledTeamId: record.teamId,
        }),
      });

      if (response.ok) {
        await fetchUserRecords();
        alert("取消登記成功");
      } else {
        const errorData = await response.json();
        alert(`取消登記失敗: ${errorData.message}`);
      }
    } catch (err) {
      console.error("Error cancelling registration:", err);
      alert("取消登記時發生錯誤");
    }
  };

  // Lazy load simulation (filter, sort, and paginate on client side)
  const getFilteredAndSortedRecords = () => {
    let filtered = [...records];

    // Filtering
    Object.keys(lazyState.filters).forEach((field) => {
      const filter = lazyState.filters[field];
      if (filter && filter.value) {
        const value = filter.value.toLowerCase();
        filtered = filtered.filter((item) => {
          const fieldValue = (item[field] || "").toString().toLowerCase();
          return fieldValue.includes(value);
        });
      }
    });

    // Sorting
    if (lazyState.sortField) {
      filtered.sort((a, b) => {
        const valA = a[lazyState.sortField];
        const valB = b[lazyState.sortField];
        let result = 0;
        if (valA < valB) result = -1;
        else if (valA > valB) result = 1;
        return lazyState.sortOrder === 1 ? result : -result;
      });
    }

    return filtered;
  };

  const onPage = (event) => {
    setLazyState((prev) => ({ ...prev, first: event.first, rows: event.rows }));
  };

  const onSort = (event) => {
    setLazyState((prev) => ({
      ...prev,
      sortField: event.sortField,
      sortOrder: event.sortOrder,
    }));
  };

  const onFilter = (event) => {
    setLazyState((prev) => ({
      ...prev,
      first: 0,
      filters: event.filters,
    }));
  };

  useEffect(() => {
    fetchUserRecords();
  }, [router]);

  if (loading) return <div className="loading-screen">載入中...</div>;
  if (error) return <div className="error-screen">發生錯誤: {error}</div>;

  const filteredSortedRecords = getFilteredAndSortedRecords();
  const displayedRecords = filteredSortedRecords.slice(
    lazyState.first,
    lazyState.first + lazyState.rows
  );
  const totalFilteredRecords = filteredSortedRecords.length;

  const actionTemplate = (rowData) => {
    return (
      <Button
        label="取消登記"
        className="p-button-danger"
        onClick={() => handleCancelRegistration(rowData)}
      />
    );
  };

  return (
    <div>
      <AppMenubar />
      <div className="records-table-container">
        <h1 className="title">查詢紀錄</h1>
        <DataTable
          value={displayedRecords}
          className="records-table"
          stripedRows
          lazy
          paginator
          removableSort
          filterDisplay="row"
          rows={lazyState.rows}
          first={lazyState.first}
          totalRecords={totalFilteredRecords}
          onPage={onPage}
          onSort={onSort}
          onFilter={onFilter}
          sortField={lazyState.sortField}
          sortOrder={lazyState.sortOrder}
          filters={lazyState.filters}
          loading={loading}
          emptyMessage="沒有相關紀錄"
          tableStyle={{ minWidth: "60rem" }}
        >
          <Column
            field="teamName"
            header="隊伍名稱"
            filter
            filterPlaceholder="搜尋"
            sortable
          ></Column>
          <Column
            field="date"
            header="日期"
            filter
            filterPlaceholder="搜尋"
            sortable
          ></Column>
          <Column field="time" header="時間" alignHeader="center" style={{ textAlign: "center", width: '5rem' }}></Column>
          <Column field="status" header="狀態" alignHeader="center" style={{ textAlign: "center", width: '5rem' }}></Column>
          <Column field="venue" header="場地" alignHeader="center" style={{ textAlign: "center", width: '5rem' }}></Column>
          <Column body={actionTemplate} header="操作" alignHeader="center" style={{ textAlign: "center", width: '10rem' }}></Column>
        </DataTable>
      </div>
    </div>
  );
}
