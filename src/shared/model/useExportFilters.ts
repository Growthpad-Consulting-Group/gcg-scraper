'use client';

/**
 * Export Filters Hook
 * Manages filtering for export functionality
 */

import { useState } from 'react';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  key: string;
}

export interface User {
  id: string;
  status?: string;
  created_at?: string;
  [key: string]: any;
}

export interface UseExportFiltersReturn {
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  dateRange: DateRange[];
  setDateRange: (range: DateRange[]) => void;
  filteredUsers: User[];
}

export default function useExportFilters(users?: User[]): UseExportFiltersReturn {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange[]>([{
    startDate: null,
    endDate: null,
    key: 'selection',
  }]);

  // Safety check for undefined users
  if (!users || !Array.isArray(users)) {
    return { 
      filterStatus, 
      setFilterStatus, 
      dateRange, 
      setDateRange, 
      filteredUsers: [] 
    };
  }

  const filteredUsers = users
    .filter((user) => {
      if (filterStatus !== 'all') {
        return (user.status || 'Pending') === filterStatus;
      }
      return true;
    })
    .filter((user) => {
      if (!dateRange[0].startDate || !dateRange[0].endDate) {
        return true;
      }

      if (!user.created_at) {
        return false;
      }

      const createdAt = new Date(user.created_at);

      if (isNaN(createdAt.getTime())) {
        return false;
      }

      const start = new Date(dateRange[0].startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange[0].endDate);
      end.setHours(23, 59, 59, 999);

      return createdAt >= start && createdAt <= end;
    });

  return { filterStatus, setFilterStatus, dateRange, setDateRange, filteredUsers };
}
