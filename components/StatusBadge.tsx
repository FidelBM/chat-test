const statusColors: Record<string, string> = {
  Customer: "bg-purple-100 text-purple-700",
  Personal: "bg-orange-100 text-orange-700",
  Employees: "bg-green-100 text-green-700",
};

const StatusBadge = ({ status }: { status: string }) => {
  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full ${
        statusColors[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
