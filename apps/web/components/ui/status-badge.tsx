interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const getStatusStyle = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    
    switch (normalizedStatus) {
      case 'DRAFT':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'PUBLISHED':
      case 'ACTIVE':
        return "bg-green-100 text-green-800 border-green-200";
      case 'CLOSED':
      case 'INACTIVE':
        return "bg-gray-100 text-gray-800 border-gray-200";
      case 'ARCHIVED':
        return "bg-red-100 text-red-800 border-red-200";
      case 'PENDING':
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <span 
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${getStatusStyle(status)} 
        ${className}
      `}
    >
      {status}
    </span>
  );
}
