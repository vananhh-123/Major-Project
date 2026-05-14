# API Configuration Guide

## Vị trí File Config

File cấu hình API nằm tại:
```
src/app/config/api.config.ts
```

## Cách Sử Dụng

### 1. Thay Đổi API Host/IP

Mở file `src/app/config/api.config.ts` và thay đổi giá trị của `API_HOST`:

```typescript
// ❌ Cũ (hardcode trong mỗi file)
http://localhost:8080/api
http://10.106.34.149:8080/api

// ✅ Mới (tập trung tại 1 file)
export const API_HOST = 'localhost';  // Thay 'localhost' bằng IP hoặc domain khác
```

### 2. Các Giá Trị Thông Dụng

- **Development (máy local)**:
  ```typescript
  export const API_HOST = 'localhost';
  ```

- **Testing với điện thoại (LAN)**:
  ```typescript
  export const API_HOST = '10.106.34.149';
  ```

- **Production (cloud server)**:
  ```typescript
  export const API_HOST = 'api.quiz.yourdomain.com';
  ```

### 3. Cấu Trúc File Config

File config cung cấp:

- `API_HOST`: Tên host/IP
- `API_PORT`: Port (mặc định 8080)
- `API_CONFIG.AUTH_API`: URL cho endpoint Auth
- `API_CONFIG.API_BASE`: URL cơ sở cho API
- `API_CONFIG.ENDPOINTS`: Tất cả endpoint cụ thể

### 4. Sử Dụng trong Code

**Trước (cũ - hardcode):**
```typescript
this.http.get('http://localhost:8080/api/quizzes')
```

**Sau (mới - dùng config):**
```typescript
import { API_CONFIG } from '../../config/api.config';

this.http.get(API_CONFIG.ENDPOINTS.QUIZZES)
// hoặc
this.http.get(API_CONFIG.API_BASE + '/quizzes')
```

## Danh Sách File Đã Được Cập Nhật

✓ `src/app/config/api.config.ts` - Config chính
✓ `src/app/core/services/auth.service.ts`
✓ `src/app/core/services/websocket.service.ts`
✓ `src/app/services/quiz.service.ts`
✓ `src/app/features/dashboard/dashboard.ts`
✓ `src/app/features/profile/profile.ts`
✓ `src/app/features/auth/login/login.ts`
✓ `src/app/features/auth/register/register.ts`
✓ `src/app/features/quiz/quiz-detail/quiz-detail.ts`
✓ `src/app/features/game/multi/game-room/game-room.ts`
✓ `src/app/features/game/solo/solo-lobby/solo-lobby.ts`
✓ `src/app/features/game/solo/game-room/game-room.ts`
✓ `src/app/features/profile-edit/profile-edit.ts`
✓ `src/app/features/game/result/result.ts`
✓ `src/app/features/review/review.ts`

## Lợi Ích

1. **Quản lý tập trung**: Thay đổi IP/host ở 1 chỗ
2. **Dễ bảo trì**: Không cần tìm kiếm từng file
3. **Tránh lỗi**: Đảm bảo tất cả endpoint dùng cùng host
4. **Linh hoạt**: Dễ dàng chuyển đổi giữa dev/test/prod

## Ví Dụ Thay Đổi Nhanh

Để chuyển sang sử dụng IP LAN `10.106.34.149`:

1. Mở `src/app/config/api.config.ts`
2. Đổi dòng:
   ```typescript
   export const API_HOST = '10.106.34.149';
   ```
3. Lưu file
4. Tất cả service sẽ tự động sử dụng IP mới! 🎉

## Thêm Endpoint Mới

Nếu cần thêm endpoint mới, chỉ cần thêm vào `ENDPOINTS` object:

```typescript
ENDPOINTS: {
  // ... existing endpoints ...
  NEW_FEATURE: `http://${API_HOST}:${API_PORT}/api/new-feature`,
  GET_NEW_DATA: (id: string) => `http://${API_HOST}:${API_PORT}/api/new-feature/${id}`,
}
```

Sau đó dùng trong code:
```typescript
this.http.get(API_CONFIG.ENDPOINTS.NEW_FEATURE)
```
