import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, X, Plus, Trash2, ImagePlus } from 'lucide-react';
import { api, type Car, type Kategori, type Transmisi, type StatusMobil, type TipeSewa } from '../../lib/api';
import { formatRupiah } from '../../lib/pricing';
import { supabase } from '../../lib/supabase';

const STATUS_BADGE: Record<StatusMobil, string> = {
  tersedia: 'bg-emerald-500/15 text-emerald-400',
  maintenance: 'bg-amber-500/15 text-amber-400',
  nonaktif: 'bg-white/10 text-white/40',
};

const inputClass =
  'w-full bg-white/5 border border-white/15 text-white text-sm rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-white/40 [&>option]:bg-[#0a0f1a]';

/**
 * Upload file langsung ke bucket publik `car-photos` lewat supabase-js
 * (anon key, sesuai §5/§8 PRD — upload dari admin dashboard tidak lewat
 * Express). Setelah file ter-upload, baru URL publiknya disimpan ke
 * tabel car_images lewat POST /api/admin/cars/:id/images.
 *
 * CATATAN KEAMANAN: policy Storage untuk bucket ini mengizinkan SEMUA
 * user authenticated meng-upload (bukan cuma admin) — lihat
 * backend/prisma/sql/002_rls_and_storage_setup.sql. Di level UI ini
 * aman karena cuma admin yang bisa sampai ke halaman ini (dijaga
 * RequireAdmin), tapi kalau ada endpoint lain yang expose upload ini ke
 * customer biasa, itu perlu policy yang lebih ketat (subquery ke
 * profiles.role) — belum dikerjakan, dicatat sebagai limitasi.
 */
async function uploadCarPhoto(carId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${carId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from('car-photos').upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from('car-photos').getPublicUrl(path);
  return data.publicUrl;
}

function PhotoManager({ car }: { car: Car }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => api.deleteCarImage(car.id, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset supaya bisa pilih file yang sama lagi

    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadCarPhoto(car.id, file);
      await api.addCarImage(car.id, { url, urutan: (car.images ?? []).length });
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-white/60 text-xs mb-1.5 block">Foto</label>

      <div className="flex flex-wrap gap-2 mb-2">
        {(car.images ?? []).map((img) => (
          <div key={img.id} className="relative w-16 h-16 overflow-hidden border rounded-lg bg-white/5 border-white/10 group">
            <img src={img.url} alt="" className="object-cover w-full h-full" />
            <button
              onClick={() => deleteMutation.mutate(img.id)}
              disabled={deleteMutation.isPending}
              className="absolute inset-0 flex items-center justify-center transition-opacity opacity-0 bg-black/60 group-hover:opacity-100"
              aria-label="Hapus foto"
            >
              <Trash2 size={14} className="text-red-400" />
            </button>
          </div>
        ))}

        <label className="flex items-center justify-center w-16 h-16 transition-colors border border-dashed rounded-lg cursor-pointer border-white/20 hover:border-white/40">
          {uploading ? (
            <Loader2 size={16} className="text-white/50 animate-spin" />
          ) : (
            <ImagePlus size={16} className="text-white/40" />
          )}
          <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="hidden" />
        </label>
      </div>

      {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
    </div>
  );
}

function EditCarModal({ car, onClose }: { car: Car; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusMobil>(car.status);
  const [tipeSewa, setTipeSewa] = useState<TipeSewa>(car.tipeSewa);
  const [hargaPerHari, setHargaPerHari] = useState(car.hargaPerHari);
  const [hargaSopirPerHari, setHargaSopirPerHari] = useState(car.hargaSopirPerHari ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      api.updateAdminCar(car.id, {
        status,
        tipeSewa,
        hargaPerHari: Number(hargaPerHari),
        hargaSopirPerHari:
          tipeSewa === 'lepas_kunci' ? null : hargaSopirPerHari ? Number(hargaSopirPerHari) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
      onClose();
    },
  });

  const butuhHargaSopir = tipeSewa !== 'lepas_kunci';

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5 overflow-y-auto">
      <div className="w-full max-w-sm rounded-2xl bg-[#0d1420] border border-white/10 p-6 my-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-white">{car.nama}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <PhotoManager car={car} />

          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusMobil)} className={inputClass}>
              <option value="tersedia">Tersedia</option>
              <option value="maintenance">Maintenance</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>

          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Tipe Sewa</label>
            <select value={tipeSewa} onChange={(e) => setTipeSewa(e.target.value as TipeSewa)} className={inputClass}>
              <option value="lepas_kunci">Lepas Kunci</option>
              <option value="dengan_sopir">Dengan Sopir</option>
              <option value="keduanya">Keduanya</option>
            </select>
          </div>

          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Harga per Hari (Rp)</label>
            <input
              type="number"
              value={hargaPerHari}
              onChange={(e) => setHargaPerHari(e.target.value)}
              className={inputClass}
            />
          </div>

          {butuhHargaSopir && (
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Harga Sopir per Hari (Rp)</label>
              <input
                type="number"
                value={hargaSopirPerHari}
                onChange={(e) => setHargaSopirPerHari(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          {mutation.isError && (
            <p className="px-3 py-2 text-xs text-red-400 border rounded-lg bg-red-500/10 border-red-500/20">
              Gagal menyimpan perubahan.
            </p>
          )}

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="mt-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-full flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

const KATEGORI_OPTIONS: Kategori[] = ['city_car', 'suv', 'mpv', 'mewah'];
const TRANSMISI_OPTIONS: Transmisi[] = ['manual', 'matic'];

function CreateCarModal({ onClose, onCreated }: { onClose: () => void; onCreated: (car: Car) => void }) {
  const queryClient = useQueryClient();
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<Kategori>('city_car');
  const [transmisi, setTransmisi] = useState<Transmisi>('manual');
  const [tipeSewa, setTipeSewa] = useState<TipeSewa>('lepas_kunci');
  const [kapasitasKursi, setKapasitasKursi] = useState('5');
  const [hargaPerHari, setHargaPerHari] = useState('');
  const [hargaSopirPerHari, setHargaSopirPerHari] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.createAdminCar({
        nama,
        kategori,
        transmisi,
        tipeSewa,
        kapasitasKursi: Number(kapasitasKursi),
        hargaPerHari: Number(hargaPerHari),
        hargaSopirPerHari:
          tipeSewa === 'lepas_kunci' ? null : hargaSopirPerHari ? Number(hargaSopirPerHari) : null,
        status: 'tersedia',
        deskripsi: deskripsi || undefined,
      }),
    onSuccess: (car) => {
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
      onCreated(car);
    },
  });

  const butuhHargaSopir = tipeSewa !== 'lepas_kunci';

  const handleSubmit = () => {
    setFormError(null);
    if (!nama.trim() || !hargaPerHari || !kapasitasKursi) {
      setFormError('Lengkapi nama, kapasitas kursi, dan harga per hari');
      return;
    }
    if (butuhHargaSopir && !hargaSopirPerHari) {
      setFormError('Harga sopir wajib diisi untuk tipe sewa ini');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5 overflow-y-auto">
      <div className="w-full max-w-sm rounded-2xl bg-[#0d1420] border border-white/10 p-6 my-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-white">Tambah Mobil</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Nama Mobil</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="mis. Toyota Avanza 2023"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Kategori</label>
              <select value={kategori} onChange={(e) => setKategori(e.target.value as Kategori)} className={inputClass}>
                {KATEGORI_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Transmisi</label>
              <select value={transmisi} onChange={(e) => setTransmisi(e.target.value as Transmisi)} className={inputClass}>
                {TRANSMISI_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Tipe Sewa</label>
            <select value={tipeSewa} onChange={(e) => setTipeSewa(e.target.value as TipeSewa)} className={inputClass}>
              <option value="lepas_kunci">Lepas Kunci</option>
              <option value="dengan_sopir">Dengan Sopir</option>
              <option value="keduanya">Keduanya</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Kapasitas Kursi</label>
              <input
                type="number"
                value={kapasitasKursi}
                onChange={(e) => setKapasitasKursi(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Harga/Hari (Rp)</label>
              <input
                type="number"
                value={hargaPerHari}
                onChange={(e) => setHargaPerHari(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {butuhHargaSopir && (
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Harga Sopir/Hari (Rp)</label>
              <input
                type="number"
                value={hargaSopirPerHari}
                onChange={(e) => setHargaSopirPerHari(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Deskripsi (opsional)</label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>

          {(formError || mutation.isError) && (
            <p className="px-3 py-2 text-xs text-red-400 border rounded-lg bg-red-500/10 border-red-500/20">
              {formError ?? 'Gagal membuat mobil baru.'}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="mt-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-full flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Buat & Lanjut Tambah Foto
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminArmadaPage() {
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: cars, isLoading, isError } = useQuery({
    queryKey: ['admin-cars'],
    queryFn: api.listAdminCars,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">Admin</p>
          <h1 className="text-3xl italic text-white font-playfair sm:text-4xl">Kelola Armada</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium px-4 py-2.5 rounded-full transition-colors"
        >
          <Plus size={16} />
          Tambah Mobil
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-white/50">
          <Loader2 size={18} className="animate-spin" />
          Memuat armada...
        </div>
      )}

      {isError && (
        <p className="px-4 py-3 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/20">
          Gagal memuat daftar mobil.
        </p>
      )}

      {cars && (
        <div className="overflow-hidden overflow-x-auto border rounded-2xl border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] text-white/40 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-medium text-left">Foto</th>
                <th className="px-4 py-3 font-medium text-left">Nama</th>
                <th className="px-4 py-3 font-medium text-left">Kategori</th>
                <th className="px-4 py-3 font-medium text-left">Harga/Hari</th>
                <th className="px-4 py-3 font-medium text-left">Tipe Sewa</th>
                <th className="px-4 py-3 font-medium text-left">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {cars.map((car) => (
                <tr key={car.id} className="border-t border-white/5 text-white/80">
                  <td className="px-4 py-3">
                    {car.images?.[0] ? (
                      <img src={car.images[0].url} alt="" className="object-cover w-10 h-10 rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/20 text-[9px]">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{car.nama}</td>
                  <td className="px-4 py-3 text-white/50">{car.kategori}</td>
                  <td className="px-4 py-3">{formatRupiah(Number(car.hargaPerHari))}</td>
                  <td className="px-4 py-3 text-white/50">{car.tipeSewa}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_BADGE[car.status]}`}>
                      {car.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingCar(car)}
                      className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {cars.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-sm text-center text-white/30">
                    Belum ada mobil. Klik "Tambah Mobil" untuk mulai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingCar && <EditCarModal car={editingCar} onClose={() => setEditingCar(null)} />}

      {creating && (
        <CreateCarModal
          onClose={() => setCreating(false)}
          onCreated={(car) => {
            setCreating(false);
            setEditingCar(car); // langsung buka edit modal untuk tambah foto
          }}
        />
      )}
    </div>
  );
}