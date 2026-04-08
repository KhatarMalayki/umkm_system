import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CartItem {
  id: number;
  name: string;
  price: string;
  quantity: number;
  unitId: number;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const { data: paymentMethods } = trpc.paymentMethods.list.useQuery();
  const createOrderMutation = trpc.orders.create.useMutation();

  // Load cart from localStorage
  useState(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to load cart:", e);
      }
    }
  });

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  const handleSubmitOrder = async () => {
    if (!paymentMethod) {
      toast.error("Pilih metode pembayaran");
      return;
    }

    if (!customerName || !customerPhone) {
      toast.error("Lengkapi data pelanggan");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createOrderMutation.mutateAsync({
        paymentMethodId: parseInt(paymentMethod),
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity.toString(),
        })),
        customerName,
        customerEmail,
        customerPhone,
        notes,
      });

      setOrderNumber(result.orderNumber);
      localStorage.removeItem("cart");
      toast.success("Pesanan berhasil dibuat!");
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat pesanan");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderNumber) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container max-w-2xl">
          <Card className="card-premium text-center">
            <CardContent className="pt-12 pb-12">
              <div className="mb-6 flex justify-center">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Pesanan Berhasil Dibuat!</h1>
              <p className="text-muted-foreground mb-6">
                Terima kasih telah berbelanja di Toko Elegan
              </p>

              <div className="bg-secondary p-6 rounded-lg mb-6">
                <p className="text-sm text-muted-foreground mb-2">Nomor Invoice</p>
                <p className="text-2xl font-bold text-primary">{orderNumber}</p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => setLocation(`/invoice/${orderNumber}`)}
                  className="w-full btn-primary"
                >
                  Lihat Invoice
                </Button>
                <Button
                  onClick={() => setLocation("/")}
                  className="w-full btn-secondary"
                >
                  Kembali ke Katalog
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle>Ringkasan Pesanan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Keranjang kosong
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} x Rp {parseFloat(item.price).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <p className="font-bold">
                          Rp {(parseFloat(item.price) * item.quantity).toLocaleString("id-ID")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle>Data Pelanggan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nama Lengkap *</Label>
                  <Input
                    id="name"
                    placeholder="Masukkan nama lengkap"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Masukkan email (opsional)"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Nomor Telepon *</Label>
                  <Input
                    id="phone"
                    placeholder="Masukkan nomor telepon"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Catatan (Opsional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Tambahkan catatan untuk pesanan Anda"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle>Metode Pembayaran</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    {paymentMethods?.map((method) => (
                      <div key={method.id} className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-secondary transition-colors cursor-pointer">
                        <RadioGroupItem value={method.id.toString()} id={`payment-${method.id}`} />
                        <Label htmlFor={`payment-${method.id}`} className="flex-1 cursor-pointer">
                          <p className="font-medium">{method.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {method.name === "cod"
                              ? "Bayar saat barang diterima"
                              : "Bayar melalui transfer bank"}
                          </p>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Total */}
          <div>
            <Card className="card-premium sticky top-24">
              <CardHeader>
                <CardTitle>Total Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 pb-4 border-b border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      Rp {cartTotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diskon</span>
                    <span className="font-medium">Rp 0</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    Rp {cartTotal.toLocaleString("id-ID")}
                  </span>
                </div>

                <Button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || cartItems.length === 0}
                  className="w-full btn-primary"
                >
                  {isSubmitting ? "Memproses..." : "Buat Pesanan"}
                </Button>

                <Button
                  onClick={() => setLocation("/")}
                  className="w-full btn-secondary"
                >
                  Lanjut Belanja
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
