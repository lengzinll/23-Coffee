"use client";

import useSWR from "swr";
import { rpc } from "@/lib/rpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { type ApiUser } from "@/lib/types";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

const fetcher = async () => {
  const res = await rpc.user.$get();
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();
  return data.data;
};

export default function UsersPage() {
  const { data, isLoading } = useSWR("/api/user", fetcher);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const totalPages = Math.ceil((data?.length || 0) / pageSize);
  const paginatedData = useMemo(() => {
    if (!data) return [];
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  if (isLoading) {
    return <LoadingScreen message="Loading users..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">System Users</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage administrators and dashboard access.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
          <CardDescription className="text-zinc-400">
            Showing {paginatedData.length} of {data?.length || 0} users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-zinc-800 text-sm max-h-[500px] overflow-auto relative">
            <Table>
              <TableHeader className="bg-zinc-800/50 sticky top-0 z-10">
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableHead className="text-zinc-300">ID</TableHead>
                  <TableHead className="text-zinc-300">Username</TableHead>
                  <TableHead className="text-zinc-300">Role</TableHead>
                  <TableHead className="text-zinc-300">Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((u: ApiUser) => (
                  <TableRow
                    key={u.id}
                    className="border-zinc-800 hover:bg-zinc-800/50"
                  >
                    <TableCell className="font-medium text-zinc-400">
                      #{u.id}
                    </TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-zinc-300 border-zinc-700 bg-zinc-800"
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="text-zinc-400"
                      suppressHydrationWarning
                    >
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedData.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-zinc-500"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-4 border-t border-zinc-800 mt-4 gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-zinc-500">
              <div>
                Showing{" "}
                <span className="text-zinc-300 font-medium">
                  {data?.length ? (currentPage - 1) * pageSize + 1 : 0}
                </span>{" "}
                to{" "}
                <span className="text-zinc-300 font-medium">
                  {Math.min(currentPage * pageSize, data?.length || 0)}
                </span>{" "}
                of{" "}
                <span className="text-zinc-300 font-medium">
                  {data?.length || 0}
                </span>{" "}
                results
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap">Rows per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => setPageSize(parseInt(val))}
                >
                  <SelectTrigger className="h-7 w-[70px] border-zinc-800 bg-zinc-900 focus:ring-0 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <div className="flex items-center gap-1 mx-2">
                <span className="text-xs text-zinc-300 font-medium">
                  {currentPage}
                </span>
                <span className="text-xs text-zinc-500">/</span>
                <span className="text-xs text-zinc-500">{totalPages || 1}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-50"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
