"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getListById } from "@/app/actions/lists";
import { getItemsByListId } from "@/app/actions/items";
import { getVoteByListAndHouse, submitVote } from "@/app/actions/votes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { List, Item, CartItem } from "@/lib/types";

export default function VotePage() {
  const params = useParams();
  const listId = params.listId as string;

  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Voting state
  const [selectedHouse, setSelectedHouse] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [existingVote, setExistingVote] = useState<{
    id: string;
    house: string;
    items: CartItem[];
  } | null>(null);

  // Generate house options (1a to 35c)
  const houseOptions = [];
  for (let i = 1; i <= 35; i++) {
    for (const letter of ["a", "b", "c"]) {
      houseOptions.push(`${i}${letter}`);
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listData, itemsData] = await Promise.all([
          getListById(listId),
          getItemsByListId(listId),
        ]);

        if (!listData) {
          setError("Lista no encontrada");
          return;
        }

        setList(listData as List);
        setItems(itemsData as Item[]);
      } catch {
        setError("Error al cargar los datos de la lista");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [listId]);

  const handleHouseChange = async (house: string) => {
    setSelectedHouse(house);
    setCart([]);
    setExistingVote(null);
    setError("");
    setSuccess("");

    if (house) {
      try {
        const vote = await getVoteByListAndHouse(listId, house);
        if (vote) {
          setExistingVote({
            id: vote.id,
            house: vote.house,
            items: vote.items.map((item) => ({
              itemId: item.itemId || "",
              quantity: item.quantity,
              name: item.itemName,
              price: parseFloat(item.itemPrice),
              imageUrl: item.itemImageUrl ?? undefined,
            })),
          });
          setCart(
            vote.items.map((item) => ({
              itemId: item.itemId || "",
              quantity: item.quantity,
              name: item.itemName,
              price: parseFloat(item.itemPrice),
              imageUrl: item.itemImageUrl ?? undefined,
            }))
          );
        }
      } catch (err) {
        console.error("Error fetching existing vote:", err);
      }
    }
  };

  const addToCart = (item: Item) => {
    const existingItem = cart.find((cartItem) => cartItem.itemId === item.id);
    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.itemId === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      setCart([
        ...cart,
        {
          itemId: item.id,
          quantity: 1,
          name: item.name,
          price: parseFloat(item.price),
          imageUrl: item.imageUrl,
        },
      ]);
    }
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.itemId !== itemId));
    } else {
      setCart(
        cart.map((item) =>
          item.itemId === itemId ? { ...item, quantity } : item
        )
      );
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.itemId !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getRemainingBudget = () => {
    if (!list) return 0;
    return parseFloat(list.budget) - getCartTotal();
  };

  const canAddItem = (item: Item) => {
    const itemPrice = parseFloat(item.price);
    return getRemainingBudget() >= itemPrice;
  };

  const handleSubmitVote = async () => {
    if (!selectedHouse) {
      setError("Por favor selecciona una casa");
      return;
    }

    if (cart.length === 0) {
      setError("Por favor agrega al menos un artículo a tu carrito");
      return;
    }

    if (cartTotal > budgetValue) {
      setError("El total del carrito excede el presupuesto");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await submitVote(
        listId,
        selectedHouse,
        cart.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
        }))
      );

      if (result.success) {
        setSuccess(
          existingVote
            ? "¡Voto actualizado exitosamente!"
            : "¡Voto enviado exitosamente!"
        );
        setExistingVote((prev) =>
          prev
            ? { ...prev, items: cart }
            : { id: result.id || "", house: selectedHouse, items: cart }
        );
      } else {
        setError(result.error || "Error al enviar el voto");
      }
    } catch {
      setError("Ocurrió un error al enviar tu voto");
    } finally {
      setIsLoading(false);
    }
  };

  const cartTotal = getCartTotal();
  const remainingBudgetValue = getRemainingBudget();
  const budgetValue = parseFloat(list?.budget || "0");
  const budgetProgress = budgetValue > 0 ? (cartTotal / budgetValue) * 100 : 0;
  const clampedBudgetProgress = Math.min(Math.max(budgetProgress, 0), 100);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Cargando...
          </h2>
          <p className="text-gray-600">
            Por favor espera mientras cargamos la página de votación
          </p>
        </div>
      </div>
    );
  }

  if (error && !list) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Algo salió mal
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  if (list?.isClosed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Votación Cerrada
          </h1>
          <p className="text-gray-600">Esta lista ya no acepta votos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
            {list?.name}
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-blue-200/50">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">
              Presupuesto:{" "}
              <span className="font-bold text-blue-600">
                ${parseFloat(list?.budget || "0").toFixed(2)}
              </span>
            </span>
          </div>
        </div>

        {!selectedHouse && (
          <>
            {/* How it works section */}
            <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 mb-8 border border-white/20">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Cómo funciona
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    Selecciona tu casa para acceder al catálogo, elige los
                    artículos que desees sin exceder el presupuesto y envía tu
                    voto para finalizar. Tus selecciones se guardan
                    automáticamente y pueden actualizarse en cualquier momento.
                  </p>
                </div>
              </div>
            </div>

            {/* House selection card */}
            <Card className="mb-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4"
                    />
                  </svg>
                </div>
                <CardTitle className="text-2xl">Selecciona tu Casa</CardTitle>
                <CardDescription className="text-base">
                  Usamos tu casa para guardar y actualizar tu voto si regresas
                  más tarde.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Select
                  value={selectedHouse || undefined}
                  onValueChange={handleHouseChange}
                >
                  <SelectTrigger className="w-full h-14 text-lg border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-colors">
                    <SelectValue placeholder="Elige el número de tu casa..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {houseOptions.map((house) => (
                      <SelectItem
                        key={house}
                        value={house}
                        className="text-base py-3"
                      >
                        Casa {house}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </>
        )}

        {selectedHouse && (
          <Card className="mb-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-xl">
                    Votando por Casa {selectedHouse}
                  </CardTitle>
                  <CardDescription className="text-base">
                    Revisa el catálogo a continuación y envía cuando termines.
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleHouseChange("")}
                className="border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16l-4-4m0 0l4-4m-4 4h18"
                  />
                </svg>
                Cambiar casa
              </Button>
            </CardHeader>
          </Card>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Algo salió mal</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4">
            <AlertTitle>Voto guardado</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {selectedHouse ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-2xl">
                        Artículos Disponibles
                      </CardTitle>
                      <CardDescription className="text-base">
                        Elige artículos para gastar tu presupuesto sabiamente.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                    {items.map((item) => (
                      <Card
                        key={item.id}
                        className="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 bg-white/90 backdrop-blur-sm"
                      >
                        <div
                          className="relative w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200"
                          style={{ aspectRatio: "4 / 3" }}
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                              <div className="text-center">
                                <svg
                                  className="w-8 h-8 mx-auto mb-2 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                <span>Sin imagen</span>
                              </div>
                            </div>
                          )}
                          <div className="absolute top-3 right-3">
                            <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-blue-200/50">
                              <span className="text-lg font-bold text-blue-600">
                                ${parseFloat(item.price).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <CardContent className="flex flex-1 flex-col gap-4 p-6">
                          <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 text-xl leading-tight">
                              {item.name}
                            </h3>
                            {item.description && (
                              <p className="text-base text-gray-600 line-clamp-3 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="mt-auto">
                            <Button
                              size="default"
                              onClick={() => addToCart(item)}
                              disabled={!canAddItem(item)}
                              className={`w-full h-12 text-base font-semibold transition-all duration-200 ${
                                canAddItem(item)
                                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl"
                                  : "bg-gray-300 cursor-not-allowed"
                              }`}
                            >
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                              </svg>
                              {canAddItem(item)
                                ? "Agregar al Carrito"
                                : "Excede Presupuesto"}
                            </Button>
                          </div>
                        </CardContent>
                        {item.mercadoLibreUrl && (
                          <CardFooter className="pt-0 pb-4">
                            <Button
                              variant="link"
                              size="sm"
                              asChild
                              className="w-full text-blue-600 hover:text-blue-700"
                            >
                              <a
                                href={item.mercadoLibreUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                                Ver en Mercado Libre
                              </a>
                            </Button>
                          </CardFooter>
                        )}
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-8 shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
                        />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-xl">Tu Carrito</CardTitle>
                      <CardDescription className="text-base">
                        Mantén tus selecciones dentro del presupuesto
                        compartido.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
                          />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">
                        Tu carrito está vacío
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Agrega artículos para comenzar
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        {cart.map((item) => (
                          <div
                            key={item.itemId}
                            className="flex-col items-center gap-4 p-3 bg-gray-50/50 rounded-xl border border-gray-200/50"
                          >
                            <div className="flex items-center gap-4">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="h-14 w-14 rounded-lg object-cover shadow-sm"
                                />
                              ) : (
                                <div className="h-14 w-14 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <svg
                                    className="w-6 h-6 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 leading-tight">
                                  {item.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  ${item.price.toFixed(2)} c/u
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-gray-300 hover:border-gray-400"
                                onClick={() =>
                                  updateQuantity(item.itemId, item.quantity - 1)
                                }
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M20 12H4"
                                  />
                                </svg>
                              </Button>
                              <span className="text-sm font-semibold w-8 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-gray-300 hover:border-gray-400"
                                onClick={() =>
                                  updateQuantity(item.itemId, item.quantity + 1)
                                }
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                  />
                                </svg>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                onClick={() => removeFromCart(item.itemId)}
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4 rounded-2xl border-2 border-gray-200/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-5">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-base">
                            <span className="font-medium text-gray-700">
                              Total
                            </span>
                            <span className="font-bold text-lg text-gray-900">
                              ${cartTotal.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-base">
                            <span className="font-medium text-gray-700">
                              Restante
                            </span>
                            <span
                              className={`font-bold text-lg ${
                                remainingBudgetValue < 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              ${remainingBudgetValue.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Presupuesto usado</span>
                            <span className="font-medium">
                              {clampedBudgetProgress.toFixed(0)}%
                            </span>
                          </div>
                          <Progress
                            value={clampedBudgetProgress}
                            className="h-3 bg-gray-200"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                          onClick={clearCart}
                        >
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Vaciar carrito
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-6">
                  <Button
                    className={`w-full h-12 text-base font-semibold transition-all duration-200 ${
                      cart.length === 0 || isLoading || remainingBudgetValue < 0
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl"
                    }`}
                    onClick={handleSubmitVote}
                    disabled={
                      cart.length === 0 || isLoading || remainingBudgetValue < 0
                    }
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Enviando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {existingVote ? "Actualizar Voto" : "Enviar Voto"}
                      </div>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="text-center shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl mx-auto mb-6 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4"
                  />
                </svg>
              </div>
              <CardTitle className="text-2xl mb-3">
                Selecciona tu casa para comenzar
              </CardTitle>
              <CardDescription className="text-base text-gray-600 max-w-md mx-auto">
                Una vez que elijas tu casa, verás los artículos disponibles y
                podrás comenzar a armar tu carrito.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
