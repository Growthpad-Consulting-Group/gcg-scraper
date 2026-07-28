"use client";

import { Icon } from "@iconify/react";
import { CSVLink } from "react-csv";

type LinkedInLead = {
  id: string;
  full_name: string;
  headline: string | null;
  location: string | null;
  current_company: string | null;
  profile_url: string | null;
  created_at: string;
};

export default function LinkedInLeadsTable({ leads, mode, onDelete }: { leads: LinkedInLead[]; mode: "light" | "dark"; onDelete: (id: string) => void }) {
  const isDark = mode === "dark";
  const csvHeaders = [
    { label: "Full Name", key: "full_name" },
    { label: "Headline", key: "headline" },
    { label: "Location", key: "location" },
    { label: "Current Company", key: "current_company" },
    { label: "Profile URL", key: "profile_url" },
  ];

  return (
    <div className={`p-6 rounded-xl shadow-md border-t-4 border-[#f05d23] ${isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          LinkedIn Leads <span className={isDark ? "text-gray-400" : "text-gray-500"}>({leads.length})</span>
        </h3>
        {leads.length > 0 && (
          <CSVLink data={leads} headers={csvHeaders} filename="linkedin_leads.csv" className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm bg-[#f05d23] text-white hover:bg-[#d04e1e]">
            <Icon icon="mdi:download" width="18" height="18" />
            Export CSV
          </CSVLink>
        )}
      </div>

      {leads.length === 0 ? (
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No LinkedIn leads yet. Run a search above to find people.</p>
      ) : (
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10">
              <tr className={isDark ? "bg-gray-700" : "bg-gray-200"}>
                <th className="p-2">Name</th>
                <th className="p-2">Headline</th>
                <th className="p-2">Company</th>
                <th className="p-2">Location</th>
                <th className="p-2">Profile</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className={`border-t ${isDark ? "border-gray-700" : "border-gray-200"} hover:bg-[#f05d23] hover:bg-opacity-10`}>
                  <td className="p-2 font-medium">{lead.full_name}</td>
                  <td className="p-2 max-w-[220px] truncate" title={lead.headline || ""}>
                    {lead.headline || "-"}
                  </td>
                  <td className="p-2">{lead.current_company || "-"}</td>
                  <td className="p-2">{lead.location || "-"}</td>
                  <td className="p-2">
                    {lead.profile_url ? (
                      <a href={lead.profile_url} target="_blank" rel="noopener noreferrer" className="text-[#f05d23] hover:underline">
                        View
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
