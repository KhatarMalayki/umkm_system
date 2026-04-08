import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function Invoice() {
  const params = useParams<{ invoiceNumber: string }>();
  const [, setLocation] = useLocation();
  const invoiceNumber = params?.invoiceNumber || "";

  const { data: invoice, isLoading } = trpc.invoices.getByNumber.useQuery(
    { invoiceNumber },
    { enabled: !!invoiceNumber }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container max-w-2xl">
          <Card className="card-premium">
            <CardContent className="pt-12 pb-12 text-center">
              <h1 className="text-2xl font-bold mb-4">Invoice Tidak Ditemukan</h1>
              <p className="text-muted-foreground mb-6">
                Invoice dengan nomor {invoiceNumber} tidak ditemukan
              </p>
              <Button onClick={() => setLocation("/")} className="btn-primary">
                Kembali ke Beranda
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="badge-success">Lunas</Badge>;
      case "partial":
        return <Badge className="badge-warning">Sebagian Dibayar</Badge>;
      case "unpaid":
        return <Badge className="badge-warning">Belum Dibayar</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="badge-success">Selesai</Badge>;
      case "confirmed":
        return <Badge className="badge-primary">Dikonfirmasi</Badge>;
      case "pending":
        return <Badge className="badge-warning">Menunggu</Badge>;
      case "cancelled":
        return <Badge className="badge-warning">Dibatalkan</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/")}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold">Invoice</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.print()} className="btn-secondary gap-2">
              <Printer className="w-4 h-4" />
              Cetak
            </Button>
          </div>
        </div>

        {/* Invoice Content */}
        <Card className="card-premium print:shadow-none">
          <CardContent className="pt-12 pb-12">
            {/* Header Section */}
            <div className="grid grid-cols-2 gap-8 mb-12 pb-8 border-b border-border">
              <div>
                <h2 className="text-2xl font-bold text-gradient mb-2">Toko Elegan</h2>
                <p className="text-muted-foreground">Toko Online Terpercaya</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-2">Nomor Invoice</p>
                <p className="text-2xl font-bold">{invoice.invoiceNumber}</p>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <h3 className="font-bold mb-3">Informasi Pelanggan</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{invoice.customerName}</p>
                  {invoice.customerEmail && <p>{invoice.customerEmail}</p>}
                  {invoice.customerPhone && <p>{invoice.customerPhone}</p>}
                </div>
              </div>
              <div className="text-right">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Tanggal Invoice</p>
                    <p className="font-medium">
                      {format(new Date(invoice.createdAt), "dd MMMM yyyy", { locale: id })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status Pembayaran</p>
                    <div className="mt-1">{getStatusBadge((invoice as any).paymentStatus || "unpaid")}</div>
                  </div>
                  {invoice.order && (
                    <div>
                      <p className="text-xs text-muted-foreground">Status Pesanan</p>
                      <div className="mt-1">{getOrderStatusBadge(invoice.order.status)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-12">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-3 font-bold">Produk</th>
                    <th className="text-center py-3 font-bold">Qty</th>
                    <th className="text-right py-3 font-bold">Harga</th>
                    <th className="text-right py-3 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items as any)?.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-border">
                      <td className="py-3">{item.productId}</td>
                      <td className="text-center py-3">{item.quantity}</td>
                      <td className="text-right py-3">
                        Rp {parseFloat(item.pricePerUnit).toLocaleString("id-ID")}
                      </td>
                      <td className="text-right py-3 font-medium">
                        Rp {parseFloat(item.subtotal).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                {invoice.notes && (
                  <div>
                    <p className="font-bold mb-2">Catatan</p>
                    <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>Rp {parseFloat(invoice.subtotal).toLocaleString("id-ID")}</span>
                </div>
                {parseFloat(invoice.discountAmount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diskon</span>
                    <span className="text-green-600">
                      -Rp {parseFloat(invoice.discountAmount).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-border pt-3">
                  <span>Total</span>
                  <span className="text-primary">
                    Rp {parseFloat(invoice.total).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            {invoice.paymentMethod === "transfer" && (
              <div className="mt-12 p-6 bg-secondary rounded-lg">
                <h3 className="font-bold mb-3">Informasi Transfer Bank</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Silakan transfer sesuai dengan total di atas ke rekening berikut:
                </p>
                {(invoice as any).bankDetails && typeof (invoice as any).bankDetails === 'object' && (
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Bank:</span> {((invoice as any).bankDetails as any).bankName}</p>
                    <p><span className="font-medium">Nomor Rekening:</span> {((invoice as any).bankDetails as any).accountNumber}</p>
                    <p><span className="font-medium">Atas Nama:</span> {((invoice as any).bankDetails as any).accountHolder}</p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
              <p>Terima kasih telah berbelanja di Toko Elegan</p>
              <p>Jika ada pertanyaan, hubungi kami melalui kontak yang tersedia</p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 justify-center print:hidden">
          <Button onClick={() => setLocation("/")} className="btn-secondary">
            Kembali ke Beranda
          </Button>
          <Button onClick={() => window.print()} className="btn-primary gap-2">
            <Printer className="w-4 h-4" />
            Cetak Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}
