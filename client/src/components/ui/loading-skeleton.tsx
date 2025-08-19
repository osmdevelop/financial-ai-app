import { Skeleton } from "@/components/ui/skeleton";

export function KPICardSkeleton() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="w-12 h-12 rounded-lg" />
      </div>
      <div className="mt-4 flex items-center space-x-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Skeleton className="h-6 w-20 rounded-full" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <Skeleton className="h-4 w-16 ml-auto" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <Skeleton className="h-4 w-20 ml-auto" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <Skeleton className="h-4 w-20 ml-auto" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <Skeleton className="h-4 w-20 ml-auto" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <Skeleton className="h-4 w-16 ml-auto" />
      </td>
    </tr>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-48" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-12" />
        </div>
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
