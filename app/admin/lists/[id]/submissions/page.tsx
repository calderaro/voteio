"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getListById } from "@/app/actions/lists";
import { getVotesByListId, resetVotesForList } from "@/app/actions/votes";
import { deleteList } from "@/app/actions/lists";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { List, Vote } from "@/lib/types";

export default function SubmissionsPage() {
  const params = useParams();
  const listId = params.id as string;
  const router = useRouter();

  const [list, setList] = useState<List | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listData, votesData] = await Promise.all([
          getListById(listId),
          getVotesByListId(listId),
        ]);

        if (!listData) {
          setError("List not found");
          return;
        }

        setList(listData as List);
        setVotes(votesData as Vote[]);
      } catch {
        setError("Failed to load submissions data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [listId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareLink(`${window.location.origin}/vote/${listId}`);
    }
  }, [listId]);

  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => setFeedbackMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      setIsCopying(true);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareLink);
        setFeedbackMessage("Link copied to clipboard");
        return;
      }
      window.prompt("Copy this vote link", shareLink);
      setFeedbackMessage("Link ready to copy");
    } catch (shareError) {
      console.error("Failed to share vote link", shareError);
      setFeedbackMessage("Could not share link");
    } finally {
      setIsCopying(false);
    }
  };

  const handleDeleteList = async () => {
    if (!list) return;
    const confirmed = window.confirm(
      "This will remove the list, all items, and votes. Continue?"
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const result = await deleteList(listId);
      if (result.success) {
        router.push("/admin");
        return;
      }
      setFeedbackMessage(result.error || "Failed to delete list");
    } catch (deleteError) {
      console.error("Failed to delete list", deleteError);
      setFeedbackMessage("An error occurred while deleting the list");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetVotes = async () => {
    if (!list) return;
    const confirmed = window.confirm(
      "This will remove all submissions for this list. Continue?"
    );
    if (!confirmed) return;

    try {
      setIsResetting(true);
      const result = await resetVotesForList(listId);
      if (result.success) {
        setVotes([]);
        setFeedbackMessage("All submissions have been reset.");
        return;
      }
      setFeedbackMessage(result.error || "Failed to reset submissions");
    } catch (resetError) {
      console.error("Failed to reset votes", resetError);
      setFeedbackMessage("An error occurred while resetting submissions");
    } finally {
      setIsResetting(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  const calculateVoteTotal = (vote: Vote) => {
    if (!vote.items) return 0;
    return vote.items.reduce((total, item) => {
      return total + parseFloat(item.itemPrice) * item.quantity;
    }, 0);
  };

  const calculateRemainingBudget = (vote: Vote) => {
    const total = calculateVoteTotal(vote);
    return parseFloat(list?.budget || "0") - total;
  };

  // Calculate aggregated statistics
  const getAggregatedStats = () => {
    const itemCounts: {
      [key: string]: {
        name: string;
        totalQuantity: number;
        totalCost: number;
        votes: number;
        unitPrice: number;
      };
    } = {};
    const totalParticipants = votes.length;
    let totalSpent = 0;
    const totalBudget = parseFloat(list?.budget || "0") * totalParticipants;
    const budgetPerHouse = parseFloat(list?.budget || "0");

    votes.forEach((vote) => {
      const voteTotal = calculateVoteTotal(vote);
      totalSpent += voteTotal;

      if (vote.items) {
        vote.items.forEach((item) => {
          const key = item.itemId || "unknown";
          if (!itemCounts[key]) {
            itemCounts[key] = {
              name: item.itemName,
              totalQuantity: 0,
              totalCost: 0,
              votes: 0,
              unitPrice: 0,
            };
          }
          itemCounts[key].totalQuantity += item.quantity;
          itemCounts[key].totalCost +=
            parseFloat(item.itemPrice) * item.quantity;
          itemCounts[key].votes += 1;
          if (!itemCounts[key].unitPrice) {
            itemCounts[key].unitPrice = parseFloat(item.itemPrice);
          }
        });
      }
    });

    const mostPopularItems = Object.values(itemCounts)
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 5);

    const averageSpending =
      totalParticipants > 0 ? totalSpent / totalParticipants : 0;

    const sortedItemsForRecommendation = Object.entries(itemCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return a.unitPrice - b.unitPrice;
      });

    const recommendedItems: {
      id: string;
      name: string;
      unitPrice: number;
      votes: number;
    }[] = [];
    let recommendedTotal = 0;

    sortedItemsForRecommendation.forEach((item) => {
      const price =
        item.unitPrice ||
        (item.totalQuantity ? item.totalCost / item.totalQuantity : 0);
      if (price <= 0) return;
      if (recommendedTotal + price <= budgetPerHouse + 1e-6) {
        recommendedItems.push({
          id: item.id,
          name: item.name,
          unitPrice: price,
          votes: item.votes,
        });
        recommendedTotal += price;
      }
    });

    const remainingBudget = Math.max(budgetPerHouse - recommendedTotal, 0);

    return {
      totalParticipants,
      totalSpent,
      totalBudget,
      averageSpending,
      mostPopularItems,
      itemCounts,
      recommendedItems,
      recommendedTotal,
      remainingBudget,
      budgetPerHouse,
    };
  };

  const stats = getAggregatedStats();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
        <p className="text-gray-600">{error}</p>
        <Link
          href="/admin"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <Card className="mb-6">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle>{list?.name} - Submissions</CardTitle>
            <CardDescription>
              Budget per house: {formatCurrency(list?.budget || "0")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/lists/${listId}/edit`}>Edit List</Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
              disabled={!shareLink || isCopying}
            >
              {isCopying ? "Copying..." : "Copy Vote Link"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleResetVotes}
              disabled={isResetting || votes.length === 0}
            >
              {isResetting ? "Resetting..." : "Reset Submissions"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteList}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete List"}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">Back to Dashboard</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>
      {feedbackMessage && (
        <Alert className="mb-6">
          <AlertDescription>{feedbackMessage}</AlertDescription>
        </Alert>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Participants
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalParticipants}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Spent
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats.totalSpent.toString())}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Average Spending
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats.averageSpending.toString())}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Budget Utilization
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {((stats.totalSpent / stats.totalBudget) * 100).toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Most Popular Items */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Most Popular Items
          </h3>
          <div className="space-y-3">
            {stats.mostPopularItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500 w-8">
                    #{index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 ml-2">
                    {item.name}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {item.votes} votes • {item.totalQuantity} total
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Shopping List */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Lista de Compra Recomendada</CardTitle>
          <CardDescription>
            Artículos más votados que encajan dentro del presupuesto por casa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.recommendedItems.length ? (
            <>
              <div className="space-y-2">
                {stats.recommendedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">
                      {item.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {item.votes} votes
                      </span>
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(item.unitPrice.toString())}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 rounded-xl border bg-muted/40 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Recommended total
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(stats.recommendedTotal.toString())}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Remaining budget
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(stats.remainingBudget.toString())}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              There isn’t enough budget-friendly consensus to recommend a final
              shopping list yet. Encourage a few more submissions.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Individual Submissions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Individual Submissions
          </h3>
          {votes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No submissions yet</p>
          ) : (
            <div className="space-y-4">
              {votes.map((vote) => (
                <div
                  key={vote.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        House {vote.house}
                      </h4>
                      {vote.userName && (
                        <p className="text-sm text-gray-500">{vote.userName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(calculateVoteTotal(vote).toString())}
                      </div>
                      <div
                        className={`text-xs ${
                          calculateRemainingBudget(vote) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {calculateRemainingBudget(vote) >= 0
                          ? "Remaining"
                          : "Over budget"}
                        :{" "}
                        {formatCurrency(
                          calculateRemainingBudget(vote).toString()
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {vote.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center">
                          {item.itemImageUrl && (
                            <img
                              src={item.itemImageUrl}
                              alt={item.itemName}
                              className="w-8 h-8 object-cover rounded mr-2"
                            />
                          )}
                          <span className="text-gray-900">{item.itemName}</span>
                          <span className="text-gray-500 ml-2">
                            x{item.quantity}
                          </span>
                        </div>
                        <span className="text-gray-600">
                          {formatCurrency(
                            (
                              parseFloat(item.itemPrice) * item.quantity
                            ).toString()
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
