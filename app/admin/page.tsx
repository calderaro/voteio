"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAllLists } from "@/app/actions/lists";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { List } from "@/lib/types";

export default function AdminDashboard() {
  const [listsData, setListsData] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const allLists = await getAllLists();
        setListsData(allLists);
      } catch (error) {
        console.error("Error fetching lists:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLists();
  }, []);

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <Card className="border-dashed">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>Voting Lists</CardTitle>
            <CardDescription>
              Manage the active lists and review the submissions from each
              house.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin/lists/new">Create New List</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {listsData.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="rounded-full bg-muted p-3 text-muted-foreground">
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M9 12h6" />
                    <path d="M9 16h6" />
                    <path d="M6 20h12a2 2 0 0 0 2-2V9.414a1 1 0 0 0-.293-.707l-5.414-5.414A1 1 0 0 0 13.586 3H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">No lists yet</CardTitle>
                  <CardDescription>
                    Get started by creating a new voting list.
                  </CardDescription>
                </div>
                <Button asChild variant="secondary">
                  <Link href="/admin/lists/new">Create your first list</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listsData.map((list) => (
                    <TableRow
                      key={list.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        router.push(`/admin/lists/${list.id}/submissions`)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/admin/lists/${list.id}/submissions`);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{list.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(list.budget)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={list.isClosed ? "destructive" : "secondary"}>
                          {list.isClosed ? "Closed" : "Open"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(list.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
