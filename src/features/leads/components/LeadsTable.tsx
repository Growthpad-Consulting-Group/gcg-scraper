"use client";

import { Icon } from "@iconify/react";
import { CSVLink } from "react-csv";

type Lead = {
  id: string;
  business_name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews_count: number | null;
  created_at: string;
};

export default function LeadsTable({ leads, mode, onDelete }: { leads: Lead[]; mode: "light" | "dark"; onDelete: (id: string) => void }) {
  const isDark = mode === "dark";
  const csvHeaders = [
    { label: "Business Name", key: "business_name" },
    { label: "Category", key: "category" },
    { label: "Address", key: "address" },
    { label: "Phone", key: "phone" },
    { label: "Website", key: "website" },
    { label: "Rating", key: "rating" },
    { label: "Reviews", key: "reviews_count" },
  ];

  return (
    <div className={`p-6 rounded-xl shadow-md border-t-4 border-[#f05d23] ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Leads <span className={isDark ? "text-gray-400" : "text-gray-500"}>({leads.length})</span>
        </h3>
        {leads.length > 0 && (
          <CSVLink data={leads} headers={csvHeaders} filename="gmb_leads.csv" className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm bg-[#f05d23] text-white hover:bg-[#d04e1e]">
            <Icon icon="mdi:download" width="18" height="18" />
            Export CSV
          </CSVLink>
        )}
      </div>

      {leads.length === 0 ? (
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No leads yet. Run a search above to find businesses.</p>
      ) : (
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10">
              <tr className={isDark ? "bg-gray-700" : "bg-gray-200"}>
                <th className="p-2">Business</th>
                <th className="p-2">Category</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Address</th>
                <th className="p-2">Rating</th>
                <th className="p-2">Website</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className={`border-t ${isDark ? "border-gray-700" : "border-gray-200"} hover:bg-[#f05d23] hover:bg-opacity-10`}>
                  <td className="p-2 font-medium">{lead.business_name}</td>
                  <td className="p-2">{lead.category || "-"}</td>
                  <td className="p-2">{lead.phone || "-"}</td>
                  <td className="p-2 max-w-[220px] truncate" title={lead.address || ""}>
                    {lead.address || "-"}
                  </td>
                  <td className="p-2">{lead.rating ? `${lead.rating} (${lead.reviews_count ?? 0})` : "-"}</td>
                  <td className="p-2">
                    {lead.website ? (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-[#f05d23] hover:underline">
                        Visit
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-2">
                    <button onClick={() => onDelete(lead.id)} className="text-red-500 hover:text-red-600">
                      <Icon icon="mdi:delete" width="18" height="18" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
