import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search, LogOut, LogIn } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useRoute } from "wouter";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);

  const { data: products, isLoading: productsLoading } = trpc.products.list.useQuery(
    { search: search || undefined }
  );

  const { data: units } = trpc.units.list.useQuery();

  const handleAddToCart = (product: any) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      setCartItems(
        cartItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: parseFloat(item.quantity) + 1 }
            : item
        )
      );
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };

  const handleRemoveFromCart = (productId: number) => {
    setCartItems(cartItems.filter(item => item.id !== productId));
  };

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
      setCartItems(
        cartItems.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  const getUnitLabel = (unitId: number) => {
    return units?.find(u => u.id === unitId)?.label || "unit";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-gradient">Toko Elegan</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ShoppingCart className="w-6 h-6 text-foreground" />
              {cartItems.length > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {user?.role === "admin" && (
                  <Link href="/admin" className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:shadow-lg transition-all">
                    Admin
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <a
                href={getLoginUrl()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
              >
                <LogIn className="w-4 h-4" />
                Login
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Cari produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 py-3 text-base"
                />
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {productsLoading ? (
                <div className="col-span-full text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Memuat produk...</p>
                </div>
              ) : products && products.length > 0 ? (
                products.map((product) => (
                  <Card
                    key={product.id}
                    className="card-elevated hover:shadow-lg transition-all overflow-hidden group"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {getUnitLabel(product.unitId)}
                          </CardDescription>
                        </div>
                        <Badge className="badge-primary">{product.quantity}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {product.description && (
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Harga</p>
                          <p className="text-2xl font-bold text-primary">
                            Rp {parseFloat(product.price).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleAddToCart(product)}
                          className="btn-primary"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Tambah
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">Tidak ada produk yang ditemukan</p>
                </div>
              )}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <Card className="card-premium sticky top-24">
              <CardHeader>
                <CardTitle>Keranjang Belanja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Keranjang kosong
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {cartItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Rp {parseFloat(item.price).toLocaleString("id-ID")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleUpdateQuantity(item.id, item.quantity - 1)
                              }
                              className="px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                handleUpdateQuantity(item.id, item.quantity + 1)
                              }
                              className="px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-border pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="text-2xl font-bold text-primary">
                          Rp {cartTotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <Link href="/checkout" className="block">
                        <Button className="w-full btn-primary">
                          Lanjut ke Checkout
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
