import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mt-12 text-center">
      <h1 className="text-3xl font-serif font-bold mb-2">Halaman Tidak Ditemukan</h1>
      <p className="text-muted text-sm mb-6">Halaman yang lu cari nggak ada di Movie Cabin.</p>
      <Link href="/" className="btn primary">
        Kembali ke Home
      </Link>
    </div>
  );
}
