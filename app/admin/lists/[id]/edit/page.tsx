"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getListById } from "@/app/actions/lists";
import {
  getItemsByListId,
  createItem,
  updateItem,
  deleteItem,
} from "@/app/actions/items";
import { updateList } from "@/app/actions/lists";

interface List {
  id: string;
  name: string;
  budget: string;
  isClosed: boolean;
}

interface Item {
  id: string;
  name: string;
  price: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  mercadoLibreUrl?: string;
}

export default function EditListPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;

  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [listName, setListName] = useState("");
  const [budget, setBudget] = useState("");
  const [isClosed, setIsClosed] = useState(false);

  // Item management
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    imageUrl: "",
    mercadoLibreUrl: "",
    imageUrls: [] as string[],
  });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isFetchingML, setIsFetchingML] = useState(false);
  const [isFetchingMLEdit, setIsFetchingMLEdit] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listData, itemsData] = await Promise.all([
          getListById(listId),
          getItemsByListId(listId),
        ]);

        if (!listData) {
          setError("List not found");
          return;
        }

        setList(listData as any);
        setListName(listData.name);
        setBudget(listData.budget);
        setIsClosed(listData.isClosed ?? false);
        setItems(itemsData as any);
      } catch (err) {
        setError("Failed to load list data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [listId]);

  const handleSaveList = async () => {
    if (!list) return;

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const result = await updateList(listId, {
        name: listName,
        budget: parseFloat(budget),
        isClosed,
      });

      if (result.success) {
        setSuccess("List updated successfully!");
        setList({ ...list, name: listName, budget, isClosed });
      } else {
        setError(result.error || "Failed to update list");
      }
    } catch (err) {
      setError("An error occurred while updating the list");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchFromMercadoLibre = async () => {
    if (!newItem.mercadoLibreUrl) {
      setError("Provide a Mercado Libre URL to fetch details");
      return;
    }

    setIsFetchingML(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/mercado-libre", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: newItem.mercadoLibreUrl }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          typeof payload.error === "string"
            ? payload.error
            : "Failed to fetch product details";
        throw new Error(message);
      }

      const payload = await response.json();
      const product = payload?.product;

      if (!product) {
        throw new Error("Invalid response from Mercado Libre fetcher");
      }

      // Update the form with the fetched data
      const fetchedImages = Array.isArray(product.images)
        ? product.images.filter(
            (url: unknown): url is string => typeof url === "string"
          )
        : [];
      const uniqueImages = Array.from(new Set(fetchedImages));

      setNewItem({
        ...newItem,
        name: product.name || newItem.name,
        price:
          typeof product.price === "number"
            ? product.price.toString()
            : newItem.price,
        description: product.description || newItem.description,
        imageUrl: uniqueImages[0] ?? newItem.imageUrl,
        imageUrls: uniqueImages.length ? uniqueImages : newItem.imageUrls,
      });

      setSuccess("Product data fetched successfully!");
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to fetch product details";
      setError(message);
    } finally {
      setIsFetchingML(false);
    }
  };

  const handleFetchFromMercadoLibreEdit = async (
    itemId: string,
    mercadoLibreUrl: string
  ) => {
    if (!mercadoLibreUrl) {
      setError("Provide a Mercado Libre URL to fetch details");
      return;
    }

    setIsFetchingMLEdit(itemId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/mercado-libre", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: mercadoLibreUrl }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          typeof payload.error === "string"
            ? payload.error
            : "Failed to fetch product details";
        throw new Error(message);
      }

      const payload = await response.json();
      const product = payload?.product;

      if (!product) {
        throw new Error("Invalid response from Mercado Libre fetcher");
      }

      // Update the item in the items list
      const fetchedImages = Array.isArray(product.images)
        ? product.images.filter(
            (url: unknown): url is string => typeof url === "string"
          )
        : [];
      const uniqueImages = Array.from(new Set(fetchedImages));

      const updatedItems = items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              name: product.name || i.name,
              price:
                typeof product.price === "number"
                  ? product.price.toString()
                  : i.price,
              description: product.description || i.description,
              imageUrl: uniqueImages[0] ?? i.imageUrl,
              imageUrls: uniqueImages.length ? uniqueImages : i.imageUrls,
            }
          : i
      );
      setItems(updatedItems);

      setSuccess("Product data fetched successfully!");
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to fetch product details";
      setError(message);
    } finally {
      setIsFetchingMLEdit(null);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price) {
      setError("Item name and price are required");
      return;
    }

    try {
      const derivedImageUrls = newItem.imageUrls.length
        ? newItem.imageUrls
        : newItem.imageUrl
        ? [newItem.imageUrl]
        : [];

      const result = await createItem(
        listId,
        newItem.name,
        parseFloat(newItem.price),
        newItem.description || undefined,
        newItem.imageUrl || undefined,
        newItem.mercadoLibreUrl || undefined,
        derivedImageUrls.length ? derivedImageUrls : undefined
      );

      if (result.success) {
        // Refresh items
        const itemsData = await getItemsByListId(listId);
        setItems(itemsData as any);
        setNewItem({
          name: "",
          price: "",
          description: "",
          imageUrl: "",
          mercadoLibreUrl: "",
          imageUrls: [],
        });
        setError("");
      } else {
        setError(result.error || "Failed to create item");
      }
    } catch (err) {
      setError("An error occurred while creating the item");
    }
  };

  const handleUpdateItem = async (itemId: string, data: Partial<Item>) => {
    try {
      const result = await updateItem(itemId, {
        name: data.name,
        price: data.price ? parseFloat(data.price) : undefined,
        description: data.description,
        imageUrl: data.imageUrl,
        mercadoLibreUrl: data.mercadoLibreUrl,
        imageUrls: data.imageUrls,
      });

      if (result.success) {
        // Refresh items
        const itemsData = await getItemsByListId(listId);
        setItems(itemsData as any);
        setEditingItem(null);
        setError("");
      } else {
        setError(result.error || "Failed to update item");
      }
    } catch (err) {
      setError("An error occurred while updating the item");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const result = await deleteItem(itemId);
      if (result.success) {
        // Refresh items
        const itemsData = await getItemsByListId(listId);
        setItems(itemsData as any);
        setError("");
      } else {
        setError(result.error || "Failed to delete item");
      }
    } catch (err) {
      setError("An error occurred while deleting the item");
    }
  };

  const totalItemsValue = items.reduce(
    (sum, item) => sum + parseFloat(item.price),
    0
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !list) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => router.push("/admin")}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit List</h1>
        <p className="text-gray-600">Manage your list and items</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="text-sm text-green-600">{success}</div>
        </div>
      )}

      {/* List Settings */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          List Settings
        </h2>
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
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="isClosed"
              name="isClosed"
              type="checkbox"
              checked={isClosed}
              onChange={(e) => setIsClosed(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label
              htmlFor="isClosed"
              className="ml-2 block text-sm text-gray-900"
            >
              Close this list (prevent new votes)
            </label>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveList}
              disabled={isSaving}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Items Management */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Items Management
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Total items: {items.length} • Total value: $
          {totalItemsValue.toFixed(2)}
        </p>

        {/* Add New Item */}
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Add New Item
          </h3>
          <div className="grid grid-cols-1 gap-4">
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
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, price: e.target.value })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                value={newItem.description}
                onChange={(e) =>
                  setNewItem({ ...newItem, description: e.target.value })
                }
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                  value={newItem.mercadoLibreUrl}
                  onChange={(e) =>
                    setNewItem({ ...newItem, mercadoLibreUrl: e.target.value })
                  }
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="https://articulo.mercadolibre.com.ar/..."
                />
                <button
                  type="button"
                  onClick={handleFetchFromMercadoLibre}
                  disabled={isFetchingML || !newItem.mercadoLibreUrl}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isFetchingML ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Fetching...
                    </>
                  ) : (
                    <>
                      <svg
                        className="-ml-1 mr-2 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Fetch Data
                    </>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Paste a Mercado Libre product URL and click "Fetch Data" to
                automatically fill in the details.
              </p>
            </div>
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
                value={newItem.imageUrl}
                onChange={(e) =>
                  setNewItem({ ...newItem, imageUrl: e.target.value })
                }
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
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
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="https://.../image-1.jpg"
              />
              <p className="mt-1 text-xs text-gray-500">
                The first URL will be used as the primary image.
              </p>
            </div>
            <button
              onClick={handleAddItem}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Item
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded mr-3"
                      />
                    )}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-sm text-gray-500">
                          {item.description}
                        </p>
                      )}
                      <p className="text-sm font-medium text-indigo-600">
                        ${parseFloat(item.price).toFixed(2)}
                      </p>
                      {item.mercadoLibreUrl && (
                        <a
                          href={item.mercadoLibreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          View on Mercado Libre
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      setEditingItem(editingItem === item.id ? null : item.id)
                    }
                    className="text-indigo-600 hover:text-indigo-900 text-sm"
                  >
                    {editingItem === item.id ? "Cancel" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {editingItem === item.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Name
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const updatedItems = items.map((i) =>
                              i.id === item.id
                                ? { ...i, name: e.target.value }
                                : i
                            );
                            setItems(updatedItems);
                          }}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Price
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => {
                            const updatedItems = items.map((i) =>
                              i.id === item.id
                                ? { ...i, price: e.target.value }
                                : i
                            );
                            setItems(updatedItems);
                          }}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => {
                          const updatedItems = items.map((i) =>
                            i.id === item.id
                              ? { ...i, description: e.target.value }
                              : i
                          );
                          setItems(updatedItems);
                        }}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Mercado Libre URL
                      </label>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="url"
                          value={item.mercadoLibreUrl || ""}
                          onChange={(e) => {
                            const updatedItems = items.map((i) =>
                              i.id === item.id
                                ? { ...i, mercadoLibreUrl: e.target.value }
                                : i
                            );
                            setItems(updatedItems);
                          }}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="https://articulo.mercadolibre.com.ar/..."
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleFetchFromMercadoLibreEdit(
                              item.id,
                              item.mercadoLibreUrl || ""
                            )
                          }
                          disabled={
                            isFetchingMLEdit === item.id ||
                            !item.mercadoLibreUrl
                          }
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {isFetchingMLEdit === item.id ? (
                            <>
                              <svg
                                className="animate-spin h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                            </>
                          ) : (
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Image URL
                      </label>
                      <input
                        type="url"
                        value={item.imageUrl || ""}
                        onChange={(e) => {
                          const updatedItems = items.map((i) =>
                            i.id === item.id
                              ? { ...i, imageUrl: e.target.value }
                              : i
                          );
                          setItems(updatedItems);
                        }}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Photo URLs (one per line)
                      </label>
                      <textarea
                        rows={3}
                        value={(item.imageUrls || []).join("\n")}
                        onChange={(e) => {
                          const urls = e.target.value
                            .split(/\n|,/)
                            .map((url) => url.trim())
                            .filter(Boolean);
                          const unique = Array.from(new Set(urls));
                          const updatedItems = items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  imageUrls: unique,
                                  imageUrl:
                                    i.imageUrl && i.imageUrl.length > 0
                                      ? i.imageUrl
                                      : unique[0] || undefined,
                                }
                              : i
                          );
                          setItems(updatedItems);
                        }}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="https://.../image-1.jpg"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        The first URL will be used as the primary image.
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingItem(null)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateItem(item.id, item)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No items yet. Add your first item above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
