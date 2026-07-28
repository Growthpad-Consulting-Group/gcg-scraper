export default function PreviewTable({
  filteredTenders,
  csvHeaders,
  previewRows,
  mode,
}: {
  filteredTenders: any[];
  csvHeaders: { label: string; key: string }[];
  previewRows: number;
  mode: "light" | "dark";
}) {
  const previewData = filteredTenders.slice(0, previewRows);

  return (
    <div className="mt-4 overflow-x-auto">
      <table className={`min-w-full ${mode === "dark" ? "bg-gray-800 text-white" : "bg-white text-[#231812]"} border border-gray-200 dark:border-gray-700 rounded-lg`}>
        <thead>
          <tr className="bg-[#f05d23] text-white">
            {csvHeaders.map((header) => (
              <th key={header.key} className="p-2 text-left font-semibold border-b border-gray-300 dark:border-gray-600">
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {previewData.length === 0 ? (
            <tr>
              <td colSpan={csvHeaders.length} className="p-4 text-center text-gray-500 dark:text-gray-400">
                No tenders to preview.
              </td>
            </tr>
          ) : (
            previewData.map((tender, index) => (
              <tr key={index} className={`${index % 2 === 0 ? (mode === "dark" ? "bg-gray-700" : "bg-gray-50") : mode === "dark" ? "bg-gray-800" : "bg-white"} border-b border-gray-200 dark:border-gray-700`}>
                {csvHeaders.map((header) => (
                  <td key={header.key} className="p-2 border-r border-gray-200 dark:border-gray-700">
                    {tender[header.key] || "-"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
