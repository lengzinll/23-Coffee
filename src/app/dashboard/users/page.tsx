"use client";

import useSWR from "swr";
import { rpc } from "@/lib/rpc";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { ChevronLeft, ChevronRight, KeyRound, Trash2 } from "lucide-react";
import { type ApiUser } from "@/lib/types";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Input } from "@/components/ui/input";
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
  const { data, isLoading, mutate } = useSWR("/api/user", fetcher);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const handleDeleteUser = async (userId: number) => {
    if (confirmText !== "CONFIRM") return;
    setDeletingId(userId);
    try {
      const res = await rpc.user[":id"].$delete({
        param: { id: userId.toString() }
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(resData.message || "User deleted successfully");
        mutate();
      } else {
        toast.error(resData.message || "Failed to delete user");
      }
    } catch (error) {
      toast.error("An error occurred while deleting user");
    } finally {
      setDeletingId(null);
      setConfirmText("");
    }
  };

  const handleResetPassword = async (userId: number) => {
    setResettingId(userId);
    try {
      const res = await rpc.user[":id"]["reset-password"].$post({
        param: { id: userId.toString() }
      });
      
      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(resData.message || "Password reset successfully");
      } else {
        toast.error(resData.message || "Failed to reset password");
      }
    } catch (error) {
      toast.error("An error occurred while resetting password");
    } finally {
      setResettingId(null);
    }
  };

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
                  <TableHead className="text-zinc-300 text-right">Actions</TableHead>
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
                      {u.timestamp
                        ? new Date(u.timestamp).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.role !== "admin" ? (
                        <div className="flex items-center justify-end gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700"
                                disabled={resettingId === u.id}
                              >
                                <KeyRound className="w-3.5 h-3.5 mr-1" />
                                {resettingId === u.id ? "Resetting..." : "Reset Password"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reset Password</AlertDialogTitle>
                                <AlertDialogDescription className="text-zinc-400">
                                  Are you sure you want to reset <span className="text-zinc-200 font-medium">{u.username}</span>&apos;s password to &apos;23coffee&apos;?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleResetPassword(u.id)}
                                >
                                  Reset Password
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
                                disabled={deletingId === u.id}
                                onClick={() => setConfirmText("")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-destructive">Delete User</AlertDialogTitle>
                                <AlertDialogDescription className="text-zinc-400">
                                  This action cannot be undone. This will permanently delete user <span className="text-zinc-200 font-medium">{u.username}</span>.
                                  <br /><br />
                                  Please type <strong className="text-white">CONFIRM</strong> below to verify.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-2">
                                <Input
                                  value={confirmText}
                                  onChange={(e) => setConfirmText(e.target.value)}
                                  placeholder="CONFIRM"
                                  className="border-zinc-800 bg-zinc-900 focus-visible:ring-destructive text-zinc-100"
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel 
                                  onClick={() => setConfirmText("")}
                                  className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteUser(u.id)}
                                  disabled={confirmText !== "CONFIRM"}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                                >
                                  {deletingId === u.id ? "Deleting..." : "Delete Menu"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600 italic px-2">Restricted</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedData.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
