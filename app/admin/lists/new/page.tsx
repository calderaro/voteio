"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createList } from "@/app/actions/lists";
import { createItem } from "@/app/actions/items";
import { authClient } from "@/lib/auth/client";

interface Item {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  mercadoLibreUrl?: string;
}

interface AuthUser {
  id: string;
  [key: string]: unknown;
}

interface NewItemFormState {
  name: string;
  price: string;
  description: string;
  imageUrl: string;
  mercadoLibreUrl: string;
  imageUrls: string[];
}

interface MercadoLibreApiResponse {
  product?: {
    name?: string;
    description?: string;
    price?: number;
    images?: string[];
  };
  error?: string;
}

export default function NewListPage() {
  const [listName, setListName] = useState("");
  const [budget, setBudget] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isFetchingItem, setIsFetchingItem] = useState(false);
  const router = useRouter();

  // Item management
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState<NewItemFormState>({
    name: "",
    price: "",
    description: "",
    imageUrl: "",
    mercadoLibreUrl: "",
    imageUrls: [],
  });

  useEffect(() => {
    const getUser = async () => {
      const session = await authClient.getSession();
      if (session.data?.user) {
        const sessionUser = session.data.user as AuthUser;
        setUser(sessionUser);
      }
    };
    getUser();
  }, []);

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) {
      setError("Item name and price are required");
      return;
    }
    const normalizedPrice = parseFloat(newItem.price.replace(/,/g, ""));
    if (Number.isNaN(normalizedPrice)) {
      setError("Price must be a valid number");
      return;
    }

    const sourceImageUrls = newItem.imageUrls.length
      ? newItem.imageUrls
      : newItem.imageUrl
      ? [newItem.imageUrl]
      : [];
    const derivedImageUrls = Array.from(new Set(sourceImageUrls));

    const item: Item = {
      id: Math.random().toString(36).substring(7),
      name: newItem.name,
      price: normalizedPrice,
      description: newItem.description || undefined,
      imageUrl: derivedImageUrls[0],
      imageUrls: derivedImageUrls.length ? derivedImageUrls : undefined,
      mercadoLibreUrl: newItem.mercadoLibreUrl || undefined,
    };

    setItems([...items, item]);
    setNewItem({
      name: "",
      price: "",
      description: "",
      imageUrl: "",
      mercadoLibreUrl: "",
      imageUrls: [],
    });
    setError("");
  };

  const handleFetchFromMercadoLibre = async () => {
    if (!newItem.mercadoLibreUrl) {
      setError("Provide a Mercado Libre URL to fetch details");
      return;
    }

    try {
      setError("");
      setIsFetchingItem(true);
      const response = await fetch("/api/mercado-libre", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: newItem.mercadoLibreUrl }),
      });

      if (!response.ok) {
        const payload = (await response
          .json()
          .catch(() => ({}))) as Partial<MercadoLibreApiResponse>;
        const message =
          typeof payload.error === "string"
            ? payload.error
            : "Failed to fetch product details";
        throw new Error(message);
      }

      const payload = (await response.json()) as MercadoLibreApiResponse;
      const product = payload?.product;
      if (!product) {
        throw new Error("Invalid response from Mercado Libre fetcher");
      }

      setNewItem((prev) => {
        const fetchedImages = Array.isArray(product.images)
          ? product.images.filter((url: unknown): url is string =>
              typeof url === "string"
            )
          : [];
        const uniqueImages = Array.from(new Set(fetchedImages));
        return {
          ...prev,
          name: product.name || prev.name,
          price:
            typeof product.price === "number"
              ? product.price.toString()
              : prev.price,
          description: product.description || prev.description,
          imageUrl: uniqueImages[0] ?? prev.imageUrl,
          imageUrls: uniqueImages.length ? uniqueImages : prev.imageUrls,
        };
      });
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to fetch product details";
      setError(message);
    } finally {
      setIsFetchingItem(false);
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName || !budget || items.length === 0) {
      setError("List name, budget, and at least one item are required");
      return;
    }

    if (!user) {
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Create list
      const listResult = await createList(
        listName,
        parseFloat(budget),
        user.id
      );
      if (!listResult.success) {
        setError(listResult.error || "Failed to create list");
        return;
      }

      // Create items
      for (const item of items) {
        const itemResult = await createItem(
          listResult.id!,
          item.name,
          item.price,
          item.description,
          item.imageUrl,
          item.mercadoLibreUrl,
          item.imageUrls
        );
        if (!itemResult.success) {
          setError("Failed to create some items");
          return;
        }
      }

      router.push("/admin");
    } catch {
      setError("An error occurred while creating the list");
    } finally {
      setIsLoading(false);
    }
  };

  const totalItemsValue = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New List</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label
                htmlFor="listName"
                className="block text-sm font-medium text-gray-700"
              >
                List Name
              </label>
              <input
                type="text"
                name="listName"
                id="listName"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="budget"
                className="block text-sm font-medium text-gray-700"
              >
                Budget per House
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="budget"
                  id="budget"
                  step="0.01"
                  min="0"
                  required
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Items</h3>

          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="itemName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Item Name
                </label>
                <input
                  type="text"
                  name="itemName"
                  id="itemName"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="itemPrice"
                  className="block text-sm font-medium text-gray-700"
                >
                  Price
                </label>
                <input
                  type="number"
                  name="itemPrice"
                  id="itemPrice"
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, price: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="itemDescription"
                className="block text-sm font-medium text-gray-700"
              >
                Description (optional)
              </label>
              <input
                type="text"
                name="itemDescription"
                id="itemDescription"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={newItem.description}
                onChange={(e) =>
                  setNewItem({ ...newItem, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="itemImageUrl"
                  className="block text-sm font-medium text-gray-700"
                >
                  Image URL (optional)
                </label>
                <input
                  type="url"
                  name="itemImageUrl"
                  id="itemImageUrl"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={newItem.imageUrl}
                  onChange={(e) =>
                    setNewItem({ ...newItem, imageUrl: e.target.value })
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="mercadoLibreUrl"
                  className="block text-sm font-medium text-gray-700"
                >
                  Mercado Libre URL (optional)
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="url"
                    name="mercadoLibreUrl"
                    id="mercadoLibreUrl"
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={newItem.mercadoLibreUrl}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        mercadoLibreUrl: e.target.value,
                      })
                    }
                    placeholder="https://www.mercadolibre..."
                  />
                  <button
                    type="button"
                    onClick={handleFetchFromMercadoLibre}
                    disabled={isFetchingItem}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                  >
                    {isFetchingItem ? "Fetching" : "Fetch"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Paste a Mercado Libre product link and fetch details automatically.
                </p>
              </div>
            </div>
            <div>
              <label
                htmlFor="itemImageUrls"
                className="block text-sm font-medium text-gray-700"
              >
                Photo URLs (one per line)
              </label>
              <textarea
                id="itemImageUrls"
                name="itemImageUrls"
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="https://.../image-1.jpg"
                value={newItem.imageUrls.join("\n")}
                onChange={(e) => {
                  const urls = e.target.value
                    .split(/\n|,/)
                    .map((url) => url.trim())
                    .filter(Boolean);
                  const unique = Array.from(new Set(urls));
                  setNewItem((prev) => ({
                    ...prev,
                    imageUrls: unique,
                    imageUrl: prev.imageUrl || unique[0] || "",
                  }));
                }}
              />
              <p className="mt-1 text-xs text-gray-500">
                The first URL will be used as the primary image.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            disabled={isFetchingItem}
          >
            Add Item
          </button>

          {items.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-900 mb-2">
                Items ({items.length}) - Total Value: $
                {totalItemsValue.toFixed(2)}
              </h4>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {item.name}
                      </div>
                      {item.description && (
                        <div className="text-sm text-gray-500">
                          {item.description}
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        ${item.price.toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="ml-4 text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create List"}
          </button>
        </div>
      </form>
    </div>
  );
}
