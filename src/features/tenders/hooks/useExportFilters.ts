"use client";

import { useState, useEffect, useCallback } from "react";

export default function useExportFilters(tenders: any[]) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState([{ startDate: null as Date | null, endDate: null as Date | null }]);
  const [filteredTenders, setFilteredTenders] = useState(tenders);

  const filterTenders = useCallback(() => {
    let result = [...tenders];

    if (filterStatus !== "all") {
      result = result.filter((tender) => tender.status?.toLowerCase() === filterStatus);
    }

    if (dateRange[0].startDate && dateRange[0].endDate) {
      const start = new Date(dateRange[0].startDate);
      const end = new Date(dateRange[0].endDate);
      result = result.filter((tender) => {
        const closingDate = new Date(tender.closing_date);
        return closingDate >= start && closingDate <= end;
      });
    }

    setFilteredTenders(result);
  }, [tenders, filterStatus, dateRange]);

  useEffect(() => {
    filterTenders();
  }, [filterTenders]);

  return { filterStatus, setFilterStatus, dateRange, setDateRange, filteredTenders };
}
