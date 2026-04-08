import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, LogOut, Package, ShoppingBag, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function AdminDashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect jika bukan admin
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="card-premium max-w-md">
          <CardContent className="pt-12 pb-12 text-center">
            <h1 className="text-2xl font-bold mb-4">Akses Ditolak</h1>
            <p className="text-muted-foreground mb-6">
              Hanya admin yang dapat mengakses halaman ini
            </p>
            <Button onClick={() => setLocation("/")} className="btn-primary">
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState("products");
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    unitId: "1",
    quantity: "",
  });

  const { data: products, refetch: refetchProducts } = trpc.products.list.useQuery();
  const { data: orders, refetch: refetchOrders } = trpc.orders.list.useQuery();
  const { data: units } = trpc.units.list.useQuery();
  const { data: invoices } = trpc.invoices.list.useQuery();

  const createProductMutation = trpc.products.create.useMutation();
  const updateOrderStatusMutation = trpc.orders.updateStatus.useMutation();

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.quantity) {
      toast.error("Lengkapi data produk");
      return;
    }

    try {
      await createProductMutation.mutateAsync({
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        unitId: parseInt(newProduct.unitId),
        quantity: newProduct.quantity,
      });

      setNewProduct({
        name: "",
        description: "",
        price: "",
        unitId: "1",
        quantity: "",
      });

      toast.success("Produk berhasil ditambahkan");
      refetchProducts();
    } catch (error: any) {
      toast.error(error.message || "Gagal menambah produk");
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await updateOrderStatusMutation.mutateAsync({
        orderId,
        status: newStatus as any,
      });

      toast.success("Status pesanan berhasil diperbarui");
      refetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Gagal memperbarui status");
    }
  };

  const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0;
  const totalOrders = orders?.length || 0;
  const totalProducts = products?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gradient">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Selamat datang, {user?.name}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="container py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-premium">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Produk</p>
                  <p className="text-3xl font-bold mt-2">{totalProducts}</p>
                </div>
                <Package className="w-12 h-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pesanan</p>
                  <p className="text-3xl font-bold mt-2">{totalOrders}</p>
                </div>
                <ShoppingBag className="w-12 h-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                  <p className="text-3xl font-bold mt-2 text-primary">
                    Rp {totalRevenue.toLocaleString("id-ID")}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products">Manajemen Produk</TabsTrigger>
            <TabsTrigger value="orders">Pesanan Masuk</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card className="card-premium">
              <CardHeader>
                <CardTitle>Tambah Produk Baru</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Nama Produk"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Harga"
                    type="number"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Kuantitas"
                    type="number"
                    value={newProduct.quantity}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, quantity: e.target.value })
                    }
                  />
                  <select
                    value={newProduct.unitId}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, unitId: e.target.value })
                    }
                    className="input-elegant"
                  >
                    {units?.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Textarea
                  placeholder="Deskripsi Produk (Opsional)"
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, description: e.target.value })
                  }
                />
                <Button onClick={handleCreateProduct} className="btn-primary gap-2">
                  <Plus className="w-4 h-4" />
                  Tambah Produk
                </Button>
              </CardContent>
            </Card>

            {/* Products List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {products?.map((product) => (
                <Card key={product.id} className="card-elevated">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{product.name}</CardTitle>
                        <CardDescription>
                          {units?.find((u) => u.id === product.unitId)?.label}
                        </CardDescription>
                      </div>
                      <Badge className="badge-primary">{product.quantity}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {product.description && (
                      <p className="text-sm text-muted-foreground">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-primary">
                        Rp {parseFloat(product.price).toLocaleString("id-ID")}
                      </p>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="space-y-4">
              {orders?.map((order) => (
                <Card key={order.id} className="card-elevated">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{order.orderNumber}</CardTitle>
                        <CardDescription>
                          {format(new Date(order.createdAt), "dd MMMM yyyy HH:mm", {
                            locale: id,
                          })}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          className={
                            order.status === "completed"
                              ? "badge-success"
                              : order.status === "pending"
                              ? "badge-warning"
                              : "badge-primary"
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold text-primary">
                          Rp {parseFloat(order.total).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleUpdateOrderStatus(order.id, e.target.value)
                          }
                          className="input-elegant text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="paid">Paid</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
