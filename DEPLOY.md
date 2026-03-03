# Hướng dẫn Triển khai Ứng dụng Chấm công WorkTime

Ứng dụng này được xây dựng bằng **React (Frontend)**, **Node.js/Express (Backend)** và hỗ trợ **SQLite/PostgreSQL (Database)**.

Để sử dụng lâu dài và bảo toàn dữ liệu, bạn cần triển khai lên một dịch vụ Cloud Hosting. Dưới đây là hướng dẫn cho **Railway** (dễ nhất) và **Render** (có gói miễn phí).

---

## Cách 1: Triển khai lên Railway (Khuyên dùng)

Railway rất phù hợp vì hỗ trợ Node.js và PostgreSQL cực tốt, ít lỗi vặt.

### Bước 1: Chuẩn bị
1. Tải toàn bộ mã nguồn này về máy tính.
2. Đẩy mã nguồn lên **GitHub** (tạo một repository mới ở chế độ Private).

### Bước 2: Tạo Project trên Railway
1. Truy cập [railway.app](https://railway.app/) và đăng nhập bằng GitHub.
2. Chọn **New Project** -> **Deploy from GitHub repo**.
3. Chọn repository `worktime` bạn vừa tạo.
4. Railway sẽ tự động phát hiện và cài đặt.

### Bước 3: Thêm Database (Quan trọng để lưu dữ liệu)
1. Trong giao diện dự án trên Railway, bấm chuột phải vào khoảng trống hoặc nút **New**.
2. Chọn **Database** -> **PostgreSQL**.
3. Chờ 1-2 phút để Database khởi tạo.
4. Railway sẽ tự động tạo biến môi trường `DATABASE_URL` và liên kết vào ứng dụng web của bạn.
5. Ứng dụng sẽ tự động chuyển từ SQLite sang PostgreSQL.

### Bước 4: Hoàn tất
1. Vào phần **Settings** -> **Domains** để lấy đường dẫn truy cập (hoặc gắn tên miền riêng).
2. Truy cập web và sử dụng. Dữ liệu sẽ được lưu vĩnh viễn trên PostgreSQL.

---

## Cách 2: Triển khai lên Render (Miễn phí)

Render có gói miễn phí nhưng server sẽ "ngủ" sau 15 phút không dùng (khởi động lại mất 30s).

### Bước 1: Chuẩn bị
Giống như trên, đẩy code lên GitHub.

### Bước 2: Tạo Database
1. Đăng nhập [render.com](https://render.com/).
2. Chọn **New** -> **PostgreSQL**.
3. Đặt tên, chọn gói **Free**.
4. Sau khi tạo xong, copy **Internal Database URL**.

### Bước 3: Tạo Web Service
1. Chọn **New** -> **Web Service**.
2. Kết nối với GitHub repo của bạn.
3. Cấu hình:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Vào phần **Environment Variables**, thêm biến:
   - Key: `DATABASE_URL`
   - Value: (Dán Internal Database URL vừa copy ở bước 2)
5. Bấm **Create Web Service**.

---

## Sao lưu dữ liệu (Backup)

Dù dùng nền tảng nào, bạn (Owner) luôn có thể tải dữ liệu về máy:
1. Đăng nhập tài khoản Owner (`dongtb@bimhanoi.com.vn`).
2. Nhìn lên góc trên bên phải, cạnh nút "Chế độ Owner".
3. Bấm nút **Sao lưu** (biểu tượng hộp lưu trữ màu xanh).
4. File `.json` chứa toàn bộ danh sách nhân viên và lịch sử chấm công sẽ được tải về máy.
