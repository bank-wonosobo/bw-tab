Desain Database Aplikasi Antrian BPR Bank Wonosobo
Saya merekomendasikan menggunakan PostgreSQL + UUID + GORM dengan arsitektur database multi-cabang (multi-branch).

Desain ini mencakup:

- Banyak kantor cabang dan kantor kas.
- Banyak jenis layanan: Teller, Customer Service, Kredit, dan lainnya.
- Banyak loket dalam satu kantor.
- Satu loket dapat melayani beberapa jenis layanan.
- Nomor antrian otomatis dan tidak boleh duplikat.
- Pemanggilan ulang, melewati antrian, dan menyelesaikan pelayanan.
- Riwayat pemanggilan.
- Display monitor antrian secara real-time.
- Laporan produktivitas pelayanan.
  Saya akan memisahkan konfigurasi, operasional antrian, dan riwayat aktivitas agar database mudah dikembangkan.

1. Entity Relationship Diagram (ERD)
   Struktur database
   branches
   Master kantor cabang dan kantor kas
   queue_services
   Jenis layanan

service_counters
Loket pelayanan

counter_services
Relasi loket dengan layanan

queue_sessions
Sesi operasional harian per cabang

queue_sequences
Generator nomor

queue_tickets
Tiket antrian

queue_calls
Riwayat pemanggilan

queue_ticket_events
Audit aktivitas

2. Master data
   A. branches
   Menyimpan kantor pusat, cabang, dan kantor kas.
   Field Tipe Keterangan
   id UUID Primary key
   parent_id UUID nullable Induk cabang
   code VARCHAR(20) Kode kantor
   name VARCHAR(150) Nama kantor
   address TEXT Alamat
   is_active BOOLEAN Status aktif
   created_at TIMESTAMP Dibuat
   updated_at TIMESTAMP Diubah

parent_id memungkinkan struktur hierarki kantor.
B. queue_services
Master jenis layanan yang disediakan bank.
Field Tipe Keterangan
id UUID PK
code VARCHAR(20) TELLER, CS, KREDIT
name VARCHAR(100) Nama layanan
prefix VARCHAR(5) T, C, K
description TEXT Deskripsi
estimated_duration INT Estimasi menit per nasabah
priority INT Urutan layanan
is_active BOOLEAN Status

Contoh data:
Code Nama Prefix
TELLER Layanan Teller A
CS Customer Service B
KREDIT Layanan Kredit C
PEMBUKAAN Pembukaan Rekening D

Prefix digunakan untuk membentuk nomor antrian, misalnya A001, B001, dan C001.
C. service_counters
Menyimpan data loket di setiap cabang.
Field Tipe Keterangan
id UUID PK
branch_id UUID FK branches
code VARCHAR(20) Kode loket
name VARCHAR(100) Loket 01
description TEXT Keterangan
is_active BOOLEAN Status

Contoh:
Cabang Loket
Wonosobo Loket 01
Wonosobo Loket 02
Kertek Loket 01
Kertek Loket 02

D. counter_services
Relasi many-to-many antara loket dan layanan.
Field Tipe Keterangan
id UUID PK
counter_id UUID FK service_counters
service_id UUID FK queue_services

Contoh:
Loket Layanan
Loket 01 Teller
Loket 01 Pembukaan Rekening
Loket 02 Teller
Loket 03 Customer Service

Dengan desain ini, satu loket dapat menangani beberapa layanan tanpa harus membuat loket baru. 3. Operasional antrian
Bagian ini merupakan inti aplikasi.
A. queue_sessions
Menyimpan sesi operasional antrian berdasarkan tanggal dan kantor.
Field Tipe Keterangan
id UUID PK
branch_id UUID FK branches
business_date DATE Tanggal operasional
status VARCHAR(20) OPEN, CLOSED
opened_at TIMESTAMP Waktu dibuka
closed_at TIMESTAMP nullable Waktu ditutup
opened_by UUID Petugas pembuka
closed_by UUID nullable Petugas penutup
created_at TIMESTAMP Dibuat

Contoh:
Cabang Tanggal Status
Wonosobo 09-11-2026 OPEN
Kertek 09-11-2026 OPEN

Satu cabang memiliki satu sesi operasional per tanggal.
B. queue_sequences
Tabel khusus untuk mengatur nomor urut antrian.
Field Tipe Keterangan
id UUID PK
session_id UUID FK queue_sessions
service_id UUID FK queue_services
last_number BIGINT Nomor terakhir
updated_at TIMESTAMP Waktu update

Contoh data:
Session Layanan Last Number
Sesi Wonosobo Teller 25
Sesi Wonosobo CS 12
Sesi Wonosobo Kredit 8

Mengapa menggunakan tabel terpisah?

Karena proses pengambilan nomor dapat dilakukan bersamaan oleh banyak nasabah. Generator nomor harus menggunakan transaksi database dan locking agar tidak menghasilkan nomor yang sama.
C. queue_tickets
Menyimpan semua tiket antrian yang diterbitkan.
Field Tipe Keterangan
id UUID PK
session_id UUID FK queue_sessions
service_id UUID FK queue_services
ticket_number BIGINT Nomor urut
ticket_code VARCHAR(20) A001
source VARCHAR(20) KIOSK, MOBILE, MANUAL
customer_name VARCHAR(150) nullable Nama nasabah
customer_reference VARCHAR(100) nullable Referensi nasabah
priority SMALLINT Prioritas
status VARCHAR(20) Status antrian
issued_at TIMESTAMP Waktu pengambilan
called_at TIMESTAMP nullable Pemanggilan pertama
started_at TIMESTAMP nullable Mulai pelayanan
completed_at TIMESTAMP nullable Selesai pelayanan
cancelled_at TIMESTAMP nullable Pembatalan
created_at TIMESTAMP Dibuat
updated_at TIMESTAMP Diubah

Status yang direkomendasikan:
Status Keterangan
WAITING Menunggu dipanggil
CALLED Sudah dipanggil
SERVING Sedang dilayani
COMPLETED Pelayanan selesai
SKIPPED Dilewati
NO_SHOW Nasabah tidak hadir
CANCELLED Dibatalkan

Contoh data:
Nomor Layanan Status
A001 Teller COMPLETED
A002 Teller COMPLETED
A003 Teller SERVING
A004 Teller WAITING
B001 CS WAITING

D. queue_calls
Menyimpan riwayat pemanggilan tiket.
Field Tipe Keterangan
id UUID PK
ticket_id UUID FK queue_tickets
counter_id UUID FK service_counters
called_by UUID Petugas
call_number INT Urutan pemanggilan
called_at TIMESTAMP Waktu panggil
response_status VARCHAR(20) CALLED, ANSWERED, NO_SHOW
created_at TIMESTAMP Dibuat

Contoh:
Nomor Loket Pemanggilan Status
A003 Loket 01 1 NO_SHOW
A003 Loket 01 2 ANSWERED
A004 Loket 01 1 CALLED

Pemisahan tabel ini penting karena satu tiket bisa dipanggil berkali-kali.
E. queue_ticket_events
Menyimpan seluruh perubahan status sebagai audit trail.
Field Tipe Keterangan
id UUID PK
ticket_id UUID FK queue_tickets
event_type VARCHAR(30) Jenis aktivitas
previous_status VARCHAR(20) nullable Status sebelumnya
new_status VARCHAR(20) Status baru
actor_id UUID nullable Petugas
counter_id UUID nullable Loket
notes TEXT nullable Catatan
created_at TIMESTAMP Waktu kejadian

Contoh aktivitas:

- TICKET_CREATED
- TICKET_CALLED
- TICKET_RECALLED
- SERVICE_STARTED
- SERVICE_COMPLETED
- TICKET_SKIPPED
- TICKET_CANCELLED
  Dengan tabel ini, administrator dapat mengetahui siapa yang melakukan perubahan dan kapan aktivitas terjadi.
